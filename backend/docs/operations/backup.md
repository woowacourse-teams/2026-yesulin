# Staging 백업

`ops/backup/` 스크립트는 DB EC2에서 실행한다.

- `mysql-logical-backup.sh`: 매일 gzip 논리 백업과 SHA-256을 S3에 저장
- `create-ebs-snapshot.sh`: 매주 MySQL data EBS crash-consistent snapshot 생성
- `verify-logical-backup.sh`: 압축과 SQL 구조 검증. 월 1회 실제 MySQL 8.4 복원 필요

systemd 예시는 매일 03:15, 일요일 04:15 Asia/Seoul 기준이다. `RetentionDays=90` tag는 자동 삭제가 아니므로
DLM 또는 별도 삭제 정책을 확인해야 한다. 실제 비밀번호와 AWS credential은 저장소에 넣지 않는다.

