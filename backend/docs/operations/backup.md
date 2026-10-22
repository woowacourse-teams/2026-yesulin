# DB 백업과 복구

DEV·PROD DB는 각 DB EC2의 Docker 컨테이너 `yesulin-mysql`로 돈다. 백업은 DB EC2의 systemd 타이머가 사람 손 없이 실행한다.
스크립트는 `ops/backup/`, 타이머는 `ops/backup/systemd/`에 있고 DB EC2의 `/usr/local/sbin`, `/etc/systemd/system`에 설치한다.
2026-10-22 PROD 적용과 첫 복구 연습 기록은 [백업·복구 기록](../../../design/db-backup-record.md)에 있다.

## 무엇을, 언제, 어디에

| 구분 | 논리 백업 (복구 기본) | 디스크 스냅샷 (보조) |
| --- | --- | --- |
| 내용 | `mysqldump --single-transaction` 전체 DB를 gzip. 덤프 직후 표별 행 수(`.counts.tsv`)와 SHA-256을 함께 남긴다 | MySQL 데이터 EBS 볼륨의 crash-consistent 스냅샷 |
| 주기 | 매일 03:15 KST (`yesulin-mysql-backup.timer`, 최대 10분 지연) | 매주 일요일 04:15 KST (`yesulin-ebs-snapshot.timer`, 최대 15분 지연) |
| PROD 위치 | `s3://techcourse-project-2026/yesulin/backups/mysql-prod/YYYY/MM/DD/yesulin-prod-*.sql.gz` | EBS 스냅샷, 이름 태그 `yesulin-db-prod-weekly` |
| DEV 위치 | `s3://techcourse-project-2026/yesulin/backups/mysql/YYYY/MM/DD/yesulin-staging-*.sql.gz` | EBS 스냅샷, 이름 태그 `yesulin-db-staging-weekly` |
| 보관 기간 | **90일**. S3 수명 주기 규칙 `yesulin-db-backup-expire-90d`(접두사 `yesulin/backups/`)가 90일 뒤 만료하고, 버전 관리로 남은 이전 버전은 1일 뒤 영구 삭제한다 | **90일**. 스냅샷 스크립트가 새 스냅샷을 만든 뒤 같은 이름 태그의 90일 지난 스냅샷을 지운다 |
| 암호화 | S3 서버 측 암호화(`--sse AES256`) | EBS 기본 암호화(KMS) |

보관 기간은 [개인정보 처리방침](../../../docs/policies/public/privacy-policy.md) 7조 6항의 "백업은 90일 순환 방식으로 만료"에 맞춘다.
백업에는 지원서 같은 개인정보가 들어 있으므로 기간을 늘리려면 처리방침부터 바꾼다.

환경별 값은 `/etc/yesulin/backup.env`에 둔다. systemd와 손으로 실행한 스크립트가 같은 값을 읽는다. 파일이 없으면 DEV 기본값을 쓴다.

```sh
# PROD /etc/yesulin/backup.env
BACKUP_LABEL=prod
BACKUP_PREFIX=yesulin/backups/mysql-prod
SNAPSHOT_NAME=yesulin-db-prod-weekly
RETENTION_DAYS=90
```

DB EC2의 IAM 역할 `ec2-project`로 S3 업로드와 스냅샷 생성·삭제를 한다. 비밀번호와 AWS credential은 저장소에 넣지 않는다.
DB 비밀번호는 컨테이너 환경 변수에서만 읽는다.

## 설치와 확인

DB EC2에 Session Manager로 접속한다(EC2 → 인스턴스 → 연결 → Session Manager). 스크립트는 공개 저장소의 특정 커밋에서 받는다.

```sh
REV=<커밋 SHA>
BASE=https://raw.githubusercontent.com/woowacourse-teams/2026-yesulin/$REV/ops/backup
sudo curl -fsSL "$BASE/mysql-logical-backup.sh" -o /usr/local/sbin/yesulin-mysql-logical-backup
sudo curl -fsSL "$BASE/create-ebs-snapshot.sh" -o /usr/local/sbin/yesulin-create-ebs-snapshot
sudo curl -fsSL "$BASE/restore-drill.sh" -o /usr/local/sbin/yesulin-restore-drill
sudo chmod 0750 /usr/local/sbin/yesulin-*
for unit in yesulin-mysql-backup.service yesulin-mysql-backup.timer yesulin-ebs-snapshot.service yesulin-ebs-snapshot.timer; do
  sudo curl -fsSL "$BASE/systemd/$unit" -o "/etc/systemd/system/$unit"
done
sudo systemctl daemon-reload
sudo systemctl enable --now yesulin-mysql-backup.timer yesulin-ebs-snapshot.timer
```

AWS CLI v2가 필요하다. PROD DB에는 없어서 2026-10-22에 공식 설치 파일(`awscli-exe-linux-aarch64.zip`)로 설치했다.

- 다음 실행 시각: `systemctl list-timers --all | grep yesulin`
- 최근 결과: `journalctl -u yesulin-mysql-backup.service -n 20`
- 바로 한 번 실행: `sudo systemctl start yesulin-mysql-backup.service`

## 복구 연습 (월 1회)

`sudo yesulin-restore-drill`은 가장 최근 논리 백업을 같은 DB EC2의 임시 MySQL 컨테이너에 되살린다. 운영 MySQL에는 쓰지 않는다.

1. 사용 가능한 메모리가 600MiB보다 적으면 시작하지 않는다(PROD는 swap이 없고 운영 MySQL 상한이 700MiB다).
2. S3에서 백업·SHA-256·행 수 파일을 내려받아 체크섬과 gzip을 검증한다.
3. 운영과 같은 MySQL 이미지로 네트워크 없는(`--network none`) 임시 컨테이너를 메모리 384MiB로 띄운다.
   메모리가 모자라면 이 컨테이너가 먼저 종료되게 `--oom-score-adj 1000`을 준다.
4. 복원 시작·완료 시각과 걸린 초를 출력한다.
5. 백업 시점 표별 행 수와 복원된 행 수를 표마다 비교해 OK/DIFF를 출력한다. 행 수는 덤프 직후 따로 센 값이라 그 사이 쓰기가
   있던 표는 DIFF가 날 수 있으며 실패로 끝내지 않는다.
6. 끝나면 임시 컨테이너와 내려받은 파일을 지운다.

DEV DB(t4g.micro)는 사용 가능한 메모리가 약 300MiB라 복구 연습을 PROD DB에서 한다. 개인정보가 다른 서버나 PC로 복사되지 않는다.

## 실제 장애 때 복구

1. 되살릴 시점의 논리 백업을 고른다. `aws s3 ls s3://techcourse-project-2026/yesulin/backups/mysql-prod/ --recursive`
2. 앱이 DB에 쓰지 않게 한다. 쓰기 중에 복원하면 데이터가 섞인다.
3. 내려받아 체크섬을 확인하고(`sha256sum -c`) 운영 컨테이너에 복원한다.
   `gzip -cd 백업.sql.gz | docker exec -i yesulin-mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -uroot'`
   덤프는 `CREATE DATABASE`와 테이블 생성 문을 포함하므로 기존 표를 덮어쓴다.
4. 처리방침에 따라 백업 이후 운영에서 삭제 처리한 정보(탈퇴·지원 내역 삭제)를 다시 지운다.
5. 앱을 다시 연결하고 health와 주요 화면을 확인한다.

DB 볼륨 자체가 망가졌으면 스냅샷으로 새 EBS 볼륨을 만들어 연결한 뒤, 그보다 최신인 논리 백업으로 맞춘다.
Flyway 마이그레이션은 되돌리지 않으므로, 앱을 이전 버전으로 함께 되돌릴 때는 [배포 문서](deployment.md)의 DB 변경 규칙을 확인한다.
