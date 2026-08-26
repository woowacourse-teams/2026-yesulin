# 백엔드 배포

CodeBuild는 `buildspec.yml`로 `backend/build/deployment/` 묶음을 만들고 CodeDeploy가 EC2에 배포한다.

1. Java 25로 Checkstyle, test, 실행 JAR를 빌드한다.
2. JAR를 `application.jar`로 고정하고 revision과 SHA-256을 기록한다.
3. `/opt/yesulin/releases/{commit-id}`에 설치하고 `current` symlink를 교체한다.
4. systemd가 `yesulin` 사용자로 `127.0.0.1:8080`에서 실행한다.
5. Nginx가 CloudFront Origin Header를 확인하고 API·OAuth 경로만 전달한다.
6. `/api/v1/health`와 Nginx·Origin 차단을 검증한다.
7. 최근 릴리스 5개를 유지한다.

EC2에는 Java 25, CodeDeploy Agent, Nginx, MySQL 연결과 root 전용 `/etc/yesulin/yesulin.env`가 필요하다.
실제 secret은 저장소와 build log에 남기지 않는다. 상세 스크립트는 `backend/deploy/`를 따른다.

legacy `files/...` 공개 파일이 있으면 AWS CLI가 설치되어 있고 EC2 instance profile이
`yesulin/files/*` 읽기와 `yesulin/public/files/*` 쓰기를 허용해야 한다. 배포 훅이 객체를 먼저 복사하고
Flyway가 DB 키를 전환하며, 이전 원본은 자동으로 삭제하지 않는다.

Spring 로그 기본 경로는 `/var/log/yesulin/yesulin.log`이며 journal에도 출력한다.
