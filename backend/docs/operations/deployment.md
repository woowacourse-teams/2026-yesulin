# 백엔드 배포

CodeBuild는 `buildspec.yml`로 `backend/build/deployment/` 묶음을 만들고 CodeDeploy가 EC2에 배포한다.

1. Java 25로 Checkstyle, test, 실행 JAR를 빌드한다.
2. JAR를 `application.jar`로 고정하고 revision과 SHA-256을 기록한다.
3. `/opt/yesulin/releases/{commit-id}`에 설치하고 `current` symlink를 교체한다.
4. systemd가 `yesulin` 사용자로 `127.0.0.1:8080`에서 실행한다.
5. Nginx가 CloudFront Origin Header를 확인하고 API·OAuth 경로만 전달한다.
6. `/api/v1/health`와 Nginx·Origin 차단을 검증한다.
7. 최근 릴리스 5개를 유지한다.

운영 대시보드 계정은 `/etc/yesulin/yesulin.env`의 `YESULIN_ADMIN_ACCOUNTS`로만 만든다. 형식은 `email:password`이고
여러 개는 쉼표로 잇는다. 비밀번호는 12자 이상이고 쉼표를 쓸 수 없다. 첫 `:`만 구분자이므로 비밀번호 안의 `:`는 허용한다.
세션 Cookie의 `Secure` 속성은 `SESSION_COOKIE_SECURE=true`로 켠다. 값을 바꾸고 재기동하면 비밀번호가 교체되고,
값을 비우면 기존 계정은 남되 새로 만들지 않는다. 계정을 없애려면 DB에서 해당 회원을 직접 지운다.

세션과 이메일 인증 토큰은 Flyway가 만드는 `SPRING_SESSION`, `SPRING_SESSION_ATTRIBUTES`,
`email_verifications`에 저장된다. 배포 전에 사용하는 DB 계정에 해당 migration의 DDL 권한이 있는지 확인한다.
세션 만료는 `SESSION_TIMEOUT`의 idle timeout을 따르며 기본값은 12시간이다. 재배포는 세션 만료 사유가 아니다.

EC2에는 Java 25, CodeDeploy Agent, Nginx, MySQL 연결과 root 전용 `/etc/yesulin/yesulin.env`가 필요하다.
실제 secret은 저장소와 build log에 남기지 않는다. 상세 스크립트는 `backend/deploy/`를 따른다.

Spring 로그 기본 경로는 `/var/log/yesulin/yesulin.log`이며 journal에도 출력한다.
