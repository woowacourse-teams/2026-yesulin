# 백엔드 배포

CodeBuild는 `buildspec.yml`로 `backend/build/deployment/` 묶음을 만들고 CodeDeploy가 EC2에 배포한다.
운영 요청은 `ALB(HTTPS 443) -> target group(HTTP 80) -> Spring Boot` 순서로 전달한다.
DEV와 PROD의 Build 액션은 각각 `DEPLOY_ENV=dev`, `DEPLOY_ENV=prod`를 명시적으로 전달한다.
빌드는 config 저장소의 `server/{DEPLOY_ENV}.env`를 선택하며 값이 없거나 다른 값이면 실패한다.
두 Pipeline 모두 `CONFIG_COMMIT_ID`와 `config-version.txt`의 일치 검증을 통과해야 한다.

공고 스케줄러는 매일 한국 시간 09:00~20:00에 10분 간격으로 실행되며 연극·퍼포먼스·뮤지컬·단원·기획사 공고만 다룬다.
PROD의 `AuditionPublishScheduler`는 새 OTR 공고를 우리 공고로 게시한 뒤 Slack으로 알린다. 운영에서 잠시 멈추려면
`YESULIN_NOTICE_SCHEDULER_ENABLED=false`를 설정한다. DEV의 기존 `AuditionNoticeScheduler`는 PROD 자동 게시가 안정될 때까지
게시 없이 알림만 계속 보낸다. 두 서버가 같은 채널로 보내므로 같은 공고 알림이 두 번 오며, 웹훅마다 다른 봇 이름으로 구분한다.
PROD 동작을 확인하면 DEV 스케줄러를 제거한다. DEV·LOCAL의 공고 게시는 관리자 화면 `/admin/posts`에서 직접 한다.
Slack 웹훅 `YESULIN_SLACK_WEBHOOK_URL`은 `server/dev.env`와 `server/prod.env`에 같은 채널의 서로 다른 봇 웹훅으로 둔다.
DEV 알림 링크도 PROD 공고가 기대와 다를 때 대비해 PROD 주소(`https://yesulin.art`)를 쓴다.
값이 없으면 게시는 되지만 알림 전송이 실패해 알림 이력이 대기 상태로 남고, 웹훅을 넣은 뒤 다음 실행에서 한 번에 보낸다.
PROD 첫 실행에는 PROD DB에 알림 이력이 없으므로 OTR 목록 첫 페이지의 해당 분류 공고가 모두 새 공고로 게시·알림된다.
현재 PROD는 인스턴스 한 대 기준이며 분산 실행 잠금은 없다. 여러 대로 늘리면 중복 알림을 막는 잠금을 먼저 추가한다.

Slack의 공고 링크는 예술in의 `/otr?vid={OTR 번호}`를 경유한다.
`YESULIN_NOTICE_LINK_BASE_URL`은 필수 환경 변수다. LOCAL은 `config/server/local.env`의
`http://localhost:3000`, DEV·PROD는 SOPS 암호화된 `config/server/dev.env`·`prod.env`의 `https://yesulin.art`를 사용한다.
DEV·PROD 알림 모두 링크 기준 주소가 PROD이므로, 링크는 PROD에 게시한 공고면 `/posts/{id}`로, 숨겼거나 게시하지 못했으면 OTR 원문으로 이동한다.
테스트용 DEV 링크는 `https://dev.yesulin.art/otr?vid={번호}`를 직접 사용한다.
환경별 YAML을 추가하지 않고 `application.yml`에서 이 변수를 읽는다. 테스트는 test resource의 값을 사용한다.
배포 환경 값은 다른 설정과 동일하게 `config/server/{환경}.env`에 SOPS로 편집하며
EC2의 복호화된 파일을 직접 수정하지 않는다. 변경한 config는 commit·push 후 `config-version.txt`와 submodule SHA를
같이 갱신한 릴리스로 배포한다. config push 전에는 버전 고정 파일을 바꾸지 않는다.
프론트의 `/otr` rewrite가 **같은 환경의 백엔드**의 `/api/v1/otr`로 전달해야 한다.
LOCAL은 프론트의 `API_ORIGIN=http://localhost:8080` 설정과 프론트 실행이 필요하다.
백엔드와 프론트를 함께 배포해야 짧은 공유 링크가 동작한다.
이미 발송된 Slack 메시지와 카카오 게시글의 OTR 직접 링크는 바뀌지 않는다. 배포 후 새 알림부터 적용된다.

클릭 수는 별도 DB나 GA에 저장하지 않고 기존 HTTP 요청 로그를 집계한다.
GET 요청 횟수이므로 고유 방문자 수는 아니며, 반복 클릭·메신저의 GET 미리보기도 포함될 수 있다.
HEAD는 집계하지 않고 Slack 메시지의 링크·미디어 unfurl은 비활성화한다.
로그 조회 및 CloudWatch 설정 조건은 [모니터링 문서](monitoring.md)의 공고 경유 링크 항목을 따른다.
기본 확인 경로는 각 환경의 `/admin` 개요다. PROD 링크 이동은 PROD 관리자에서, DEV 테스트 링크 이동은 DEV
관리자에서 확인한다. 두 환경 모두 이 백엔드와 프론트를 배포해야 하며 서로의 통계를 합산하거나 교차 조회하지 않는다.
배포 서버에 JSON 로그 파일이 없으면 이동 집계도 불가하다. 기존 journal 콘솔 로그만으로 대신 집계하지 않는다.

오디션 일정표 문자에 넣는 링크는 `YESULIN_TIMETABLE_LINK_BASE_URL`(같은 환경의 프론트 origin)로 만든다. 값이 없으면
`YESULIN_NOTICE_LINK_BASE_URL`을 쓰는데, DEV의 공고 링크 주소는 PROD 프론트이므로 DEV에는 `https://dev.yesulin.art`를 따로
설정해야 DEV 일정표 링크가 DEV 백엔드로 연결된다. 문자 발송 대기 신호는 선택 변수 `YESULIN_TIMETABLE_SLACK_WEBHOOK_URL`의
Incoming Webhook으로 보내며, 비어 있으면 `TIMETABLE_MESSAGES_QUEUED` 로그만 남긴다. 예상하지 못한 서버 오류는 선택 변수
`YESULIN_ERROR_SLACK_WEBHOOK_URL`로 보낸다. OTR 공고 알림 채널과 섞지 않고 환경별로 아래 채널을 쓴다.

| 변수 | LOCAL·DEV | PROD |
| --- | --- | --- |
| `YESULIN_TIMETABLE_SLACK_WEBHOOK_URL` | 로컬 및 dev용 알림 채널 | 스케줄 알림 채널 |
| `YESULIN_ERROR_SLACK_WEBHOOK_URL` | 로컬 및 dev용 알림 채널 | 버그 알림 채널 |

Slack 웹훅 세 개(OTR 공고 `YESULIN_SLACK_WEBHOOK_URL` 포함)는 `src/main/resources/properties/slack.yml`의 `yesulin.slack.*`로
읽고 `application.yml`이 이 파일을 import한다. DEV·PROD 값은 다른 설정과 같이 `config/server/{환경}.env`에 SOPS로 편집하고,
로컬은 Git에서 제외된 `config/server/local.env`에 둔다. 로컬과 DEV가 같은 채널을 쓰므로 메시지 앞의 `[LOCAL]`·`[DEV]`로 구분한다.

1. PR CI가 Java 25로 Checkstyle과 test를 수행하고, CodeBuild가 실행 JAR를 빌드한다.
2. JAR를 `application.jar`로 고정하고 revision과 SHA-256을 기록한다.
3. JAR와 복호화한 환경 파일을 `/opt/yesulin/releases/{commit-id}`에 함께 설치한 뒤 `current` symlink를 교체한다.
   복호화가 실패하면 `current`는 이전 릴리스를 계속 가리킨다. 롤백하면 이전 JAR와 환경 파일이 함께 선택된다.
4. systemd가 `yesulin` 사용자로 Spring을 `0.0.0.0:80`에서 실행한다. 비특권 사용자에게는
   `CAP_NET_BIND_SERVICE`만 부여한다.
5. CodeDeploy가 `http://127.0.0.1:80/actuator/health/readiness`의 HTTP 200을 확인한다.
   일시적인 기동 편차는 최대 60회 재시도로 허용하며, 준비되면 즉시 다음 단계로 진행한다.
6. ALB target group도 같은 readiness endpoint를 확인한 뒤에만 트래픽을 전달한다.
7. 최근 릴리스 5개를 유지한다.

스테이징 target group의 deregistration delay는 60초로 운영한다. 현재 target이 한 대뿐이므로 드레이닝이 시작되면
신규 요청을 받을 다른 인스턴스가 없고, 기본값 300초는 이미 처리 중인 요청을 보호하는 대신 배포 중 신규 요청 불가 시간을
늘린다. 60초는 일반적인 API 요청에는 종료 여유를 주면서 배포마다 발생하던 약 5분의 대기를 줄이기 위한 값이다.
60초를 넘는 응답·다운로드·스트리밍을 도입하거나 target 구성이 바뀌면 요청 시간 분포를 확인하고 다시 결정한다.

AWS CLI 자격 증명과 region을 설정한 운영 환경에서 다음 명령으로 값을 적용한다. 스크립트는 변경 후 실제 적용값도 다시
조회하며, target group ARN은 저장소에 기록하지 않는다.

```bash
sh ops/configure/staging-alb-draining.sh <target-group-arn>
```

`project-app` Security Group은 `project-lb` Security Group에서 들어오는 80 포트만 허용한다. EC2에는 공인 IP를
부여하지 않으며, 인터넷에서 EC2의 80·8080 포트로 직접 접근하는 경로를 만들지 않는다. TLS 인증서와 HTTPS 종료는
ALB와 ACM이 담당하므로 EC2에 Nginx와 Let's Encrypt 인증서를 설치하지 않는다.

readiness에는 Spring의 readiness 상태와 DB 연결 상태가 포함된다. 따라서 프로세스만 실행 중이거나 DB에 연결할 수 없는
인스턴스는 ALB의 정상 대상으로 등록되지 않는다. 상세 health 정보는 외부에 노출하지 않는다.

운영 대시보드 계정은 배포 릴리스의 `yesulin.env`에 있는 `YESULIN_ADMIN_ACCOUNTS`로만 만든다. 형식은 `email:password`이고
여러 개는 쉼표로 잇는다. 비밀번호는 12자 이상이고 쉼표를 쓸 수 없다. 첫 `:`만 구분자이므로 비밀번호 안의 `:`는 허용한다.
세션 Cookie의 `Secure` 속성은 `SESSION_COOKIE_SECURE=true`로 켠다. 값을 바꾸고 재기동하면 비밀번호가 교체되고,
값을 비우면 기존 계정은 남되 새로 만들지 않는다. 계정을 없애려면 DB에서 해당 회원을 직접 지운다.

지원서와 미사용 파일 삭제는 같은 2차 확인 비밀번호를 사용한다. 원문 대신 BCrypt 해시만
`YESULIN_ADMIN_DELETION_PASSWORD_HASH`에 둔다. 이미 지원서 삭제가 작동한다면 파일 삭제용 설정을 추가할 필요가 없다.
파일 삭제 API는 로그인한 ADMIN과 CSRF 토큰을 요구하고, 선택한 파일 최대 100개를 한 요청에서
비밀번호 한 번으로 확인한다. 해시가 비어 있으면 두 삭제 기능 모두 거부되지만 조회는 가능하다.
이 확인 비밀번호는 독립적인 MFA가 아니다.

비밀번호를 새로 설정하거나 교체해야 한다면
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

출력된 한 줄을 대상 환경의 config 저장소 `server/dev.env` 또는 `server/prod.env`에 SOPS로 편집하고 새 버전을 배포한다. 서버의 복호화된 파일을
직접 수정하지 않는다. 이 값이 비어 있으면 admin 조회는 가능하지만
지원서와 파일 삭제는 `403 ADMIN_DELETION_CONFIRMATION_FAILED`로 거부된다. 원문 비밀번호나 생성 명령의 입력값은 문서·메신저·저장소에 남기지 않는다.

지원서 삭제 비밀번호는 추가 확인 수단이며 OTP 같은 독립적인 MFA는 아니다.
지원서 삭제 확인은 관리자 계정별 최근 10분 내 실패가 5회가 되면 그 시점부터 10분 동안 잠긴다. 조회·로그인은 계속 가능하다.
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

EC2에는 Java 25, CodeDeploy Agent, `sops`, DB 네트워크 연결과 배포 전용 age private key
`/etc/yesulin/sops/age/keys.txt`가 필요하다. 현재는 별도의 비밀 저장소 권한이 없어 배포 전용 키를
AMI에 포함하는 방식으로 새 ASG 인스턴스에 전달한다. 키와 상위 디렉터리는 root 소유로 두고 각각 `0600`,
`0700` 권한을 적용한다. 이 방식은 AMI·스냅샷을 읽을 수 있는 주체에게도 복호화 권한을 주므로 접근 권한을
제한하고, 비밀 저장소를 사용할 수 있게 되면 키 전달 방식을 교체한다. CodeBuild는 선택된
`server/dev.env` 또는 `server/prod.env`의 암호문만 배포 아티팩트의 `config/runtime.env`에 포함하며 복호화하지 않는다.
CodeDeploy는 EC2에서 각 릴리스의 `yesulin.env`를 복호화하여 root 소유·`yesulin` 그룹·`0640` 권한으로 만든다.
실제 secret은 저장소·build log에 남기지 않는다.
AMI에 평문 secret이 남지 않았는지는 별도로 검증해야 한다. private key는 저장소·build log에 남기지 않는다.
상세 스크립트는 `backend/deploy/`를 따른다.

새 인스턴스를 자동 생성하는 Launch Template에는 `ec2-project` IAM Instance Profile과 Java 25·CodeDeploy Agent·
`sops` 설치 및 배포 전용 키를 포함한 AMI를 지정해야 한다. 새 인스턴스에서 키를 읽을 수 없다면 `AfterInstall`이 실패하며,
릴리스 환경 파일이 없으면 `ApplicationStart`가 실패한다. 현재 수동으로 설정한 EC2만 검증해서는 ASG 교체가
준비되었다고 볼 수 없다.

AMI를 만들기 전에는 원본 인스턴스에 `/etc/yesulin/yesulin.env`,
`/opt/yesulin/releases/*/yesulin.env` 같은 평문 환경 파일이 없는지 확인한다. 현재 서비스가 읽는
`/etc/yesulin/yesulin.env`는 실행 중인 인스턴스에서 미리 지우지 않는다. 파일을 지우면 다음 재시작에 실패할 수
있으므로, 트래픽을 받지 않는 이미지 준비용 인스턴스에서 정리하거나 배포 경로를 전환한 뒤 정비 시간에 처리한다.
AMI 생성 전까지는 기존 서비스와 릴리스 파일을 보존한다.

소셜 로그인은 프록시가 관찰한 내부 호스트가 아니라 사용자가 접속하는 프론트 주소로 이동하도록 세 URL을 명시한다.
특히 실패 URL은 상대 경로를 허용하지 않으며, 누락되거나 HTTP(S) 절대 URL이 아니면 애플리케이션 시작을 거부한다.

```dotenv
SOCIAL_LOGIN_REDIRECT_URI=https://yesulin.art/login/oauth2/code/{registrationId}
SOCIAL_LOGIN_SUCCESS_REDIRECT=https://yesulin.art/social-login/complete
SOCIAL_LOGIN_FAILURE_REDIRECT=https://yesulin.art/login?socialLoginError=true
```

인증 제공자 콜백이 실패하면 백엔드는 실패 종류의 안전한 오류 코드만 구조화 로그에 남기고
`SOCIAL_LOGIN_FAILURE_REDIRECT`로 이동한다. OAuth `code`, `state`, 토큰과 예외 메시지는 기록하거나 URL에 싣지 않는다.
환경 값을 바꾼 뒤에는 config 커밋과 애플리케이션의 버전 고정을 갱신해 새 릴리스로 배포해야 한다.

Spring 로그 기본 경로는 `/var/log/yesulin/yesulin.log`이며 한 이벤트당 한 줄인 JSON으로 기록한다. journal에는
같은 이벤트를 짧은 텍스트로 출력한다. systemd unit은 `TZ=Asia/Seoul`을 지정해 파일 JSON과 journal의 시각대를 맞춘다.
