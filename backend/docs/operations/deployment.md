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

지원서 삭제용 별도 비밀번호는 원문 대신 BCrypt 해시만 `YESULIN_ADMIN_DELETION_PASSWORD_HASH`에 둔다.
`backend` 디렉터리의 CMD 또는 PowerShell에서 아래 명령을 실행한다. 비밀번호는 별표로 표시되며 두 번 입력한다.
`RemoteSigned`는 이 PowerShell 프로세스에만 적용하고 시스템 실행 정책은 변경하지 않는다.

```powershell
powershell -NoProfile -ExecutionPolicy RemoteSigned -File .\scripts\generate-admin-deletion-password-hash.ps1
```

스크립트가 출력한 `$2a$...` BCrypt 해시만 서버 환경 변수에 복사한다. Gradle 태스크를 직접 실행하면
자식 Java 프로세스에 대화형 콘솔이 없어 안전하게 비밀번호를 숨길 수 없으므로 반드시 위 스크립트를 사용한다.
비밀번호는 12자 이상이며 BCrypt 제약으로 UTF-8 72바이트 이하여야 한다(영문·숫자는 최대 72자, 한글은 글자당 보통 3바이트).
Windows PowerShell 5.1의 UTF-8 BOM과 PowerShell 7의 BOM 없는 입력을 모두 처리한다.
입력값은 명령 인자·환경 변수·파일에 저장하지 않는다. 해시 계산 동안 프로세스 메모리와 표준입력에는 평문이 존재하며,
관리형 문자열의 메모리 잔존까지 완전히 지우는 것은 보장하지 않는다.

출력된 한 줄을 `/etc/yesulin/yesulin.env`에 설정하고 서비스를 재기동한다. 이 값이 비어 있으면 admin 조회는 가능하지만
지원서 삭제는 `403 ADMIN_DELETION_CONFIRMATION_FAILED`로 거부된다. 원문 비밀번호나 생성 명령의 입력값은 문서·메신저·저장소에 남기지 않는다.

삭제 비밀번호는 추가 확인 수단이며 OTP 같은 독립적인 MFA는 아니다.
삭제 확인은 관리자 계정별 최근 10분 내 실패가 5회가 되면 그 시점부터 10분 동안 잠긴다. 조회·로그인은 계속 가능하다.
잠금 전 확인 성공 시 실패 이력을 초기화한다. 잠금 중 요청은 비밀번호 비교 없이 거부하며 잠금 시간을 연장하지 않는다.
여러 탭·재로그인·다른 지원서에서도 같은 계정의 제한을 공유한다. 오류 메시지에 남은 대기 초를 안내한다.
상태는 서버 메모리만 사용하므로 DB 변경은 없지만 **재시작·재배포 시 초기화되며 서버 인스턴스 간에는 공유되지 않는다.**
단일 인스턴스 베타 운영용이며, 다중 인스턴스 전환 전 DB·공유 캐시 기반 제한으로 교체해야 한다.
만료 상태는 다음 삭제 확인 요청 때 정리한다. 실패 로그에는 관리자 내부 ID와 `REJECTED`/`LOCKED` 결과만 담는다.
삭제 기능 활성화 전 HTTPS, `SESSION_COOKIE_SECURE=true`, root 전용 환경 파일 권한을 확인한다.
요청 본문·DTO·Command를 로그로 남기지 않는다. 삭제 비밀번호 DTO·Command의 문자열 출력은 `[REDACTED]`로 마스킹하고,
공통 JSON 파싱·잘못된 인자 오류의 DEBUG 로그에는 예외 원문·원인을 출력하지 않는다.
HTTP 본문이나 객체를 별도로 직렬화하는 로깅은 이 마스킹으로 보호되지 않으므로 활성화하지 않는다.
위 조건의 실제 서버 적용 여부는 로컬 빌드 통과와 별도로 확인해야 한다.

세션과 이메일 인증 토큰은 Flyway가 만드는 `SPRING_SESSION`, `SPRING_SESSION_ATTRIBUTES`,
`email_verifications`에 저장된다. 배포 전에 사용하는 DB 계정에 해당 migration의 DDL 권한이 있는지 확인한다.
세션 만료는 `SESSION_TIMEOUT`의 idle timeout을 따르며 기본값은 12시간이다. 재배포는 세션 만료 사유가 아니다.

EC2에는 Java 25, CodeDeploy Agent, Nginx, MySQL 연결과 root 전용 `/etc/yesulin/yesulin.env`가 필요하다.
실제 secret은 저장소와 build log에 남기지 않는다. 상세 스크립트는 `backend/deploy/`를 따른다.

소셜 로그인은 프록시가 관찰한 내부 호스트가 아니라 사용자가 접속하는 프론트 주소로 이동하도록 세 URL을 명시한다.
특히 실패 URL은 상대 경로를 허용하지 않으며, 누락되거나 HTTP(S) 절대 URL이 아니면 애플리케이션 시작을 거부한다.

```dotenv
SOCIAL_LOGIN_REDIRECT_URI=https://yesulin.art/login/oauth2/code/{registrationId}
SOCIAL_LOGIN_SUCCESS_REDIRECT=https://yesulin.art/social-login/complete
SOCIAL_LOGIN_FAILURE_REDIRECT=https://yesulin.art/login?socialLoginError=true
```

인증 제공자 콜백이 실패하면 백엔드는 실패 종류의 안전한 오류 코드만 구조화 로그에 남기고
`SOCIAL_LOGIN_FAILURE_REDIRECT`로 이동한다. OAuth `code`, `state`, 토큰과 예외 메시지는 기록하거나 URL에 싣지 않는다.
환경 파일을 바꾼 뒤에는 `yesulin.service`를 재시작해야 실행 중인 JVM에 반영된다.

Spring 로그 기본 경로는 `/var/log/yesulin/yesulin.log`이며 한 이벤트당 한 줄인 JSON으로 기록한다. journal에는
같은 이벤트를 짧은 텍스트로 출력한다. systemd unit은 `TZ=Asia/Seoul`을 지정해 파일 JSON과 journal의 시각대를 맞춘다.
