# Staging 데이터 백업

이 디렉터리의 스크립트는 DB EC2에서 실행합니다. 실제 비밀번호나 AWS 자격 증명은 저장소에 넣지 않으며, MySQL 컨테이너 환경 변수와 EC2 IAM Role을 사용합니다.

## 백업 계층

- `mysql-logical-backup.sh`: 매일 MySQL 논리 백업을 gzip으로 압축하고 SHA-256 파일과 함께 `s3://techcourse-project-2026/yesulin/backups/mysql/`에 저장합니다.
- `create-ebs-snapshot.sh`: 매주 `/data/mysql` EBS 볼륨의 crash-consistent Snapshot을 요청합니다. 논리 백업의 대체물이 아닙니다.
- `verify-logical-backup.sh`: 다운로드한 파일의 압축과 기본 SQL 구조를 검사합니다. 월 1회 별도 MySQL 8.4 환경에서 실제 복원까지 확인해야 합니다.

`systemd/`에는 권장 시간인 매일 03:15, 일요일 04:15(Asia/Seoul) Timer 예시가 있습니다. 설치 전 DB EC2에서 다음을 확인합니다.

```sh
aws sts get-caller-identity --region ap-northeast-2 --no-cli-pager
aws s3api head-bucket --bucket techcourse-project-2026 --region ap-northeast-2
```

DB EC2에 이 디렉터리를 안전하게 전달한 뒤 다음 경로에 설치합니다.

```sh
sudo install -o root -g root -m 0750 mysql-logical-backup.sh \
  /usr/local/sbin/yesulin-mysql-logical-backup
sudo install -o root -g root -m 0750 create-ebs-snapshot.sh \
  /usr/local/sbin/yesulin-create-ebs-snapshot
sudo install -o root -g root -m 0644 systemd/*.service systemd/*.timer \
  /etc/systemd/system/
```

Snapshot 생성에는 `ec2:CreateSnapshot`과 Snapshot 태그 권한이 필요합니다. `RetentionDays=90` 태그는 자동 삭제를 수행하지 않으므로, 교육 계정 관리자의 DLM 정책 또는 삭제 권한을 별도로 확인해야 합니다.

Timer 설치 후에는 즉시 한 번 수동 실행하고 결과를 검증합니다.

```sh
sudo systemctl daemon-reload
sudo systemctl enable --now yesulin-mysql-backup.timer yesulin-ebs-snapshot.timer
systemctl list-timers 'yesulin-*'
```
