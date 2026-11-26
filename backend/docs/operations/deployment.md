# 백엔드 배포

## PDF 분석 오류 알림과 재분석 링크

LOCAL·DEV의 서버 오류와 PDF 지원자 분석 최종 실패는 항상 지정된 개발/로컬 오류 채널로 보낸다.
`YESULIN_ERROR_SLACK_WEBHOOK_URL`과 `YESULIN_PDF_AI_SLACK_WEBHOOK_URL`에 같은 지정 웹훅을 사용한다.
실제 URL은 DEV의 SOPS 암호화 `config/server/dev.env`와 Git 제외 `config/server/local.env`에만 보관한다.
웹훅을 문서·PR·로그·예제에 복사하지 않는다. PROD의 기존 오류 채널은 분리해 유지한다.

Slack 버튼은 환경별 프론트 `/pdf-ai/retry`로 이동하는 URL 버튼이다. Signing Secret/Interactivity 설정은
필요 없다. 확인 화면에서 본인 공연사 또는 운영자 세션으로 로그인하고 명시적인 POST를 실행한다.
LOCAL 기본 localhost:3000, DEV 기본 https://dev.yesulin.art, PROD 기본 https://yesulin.art다.
다른 프론트 주소는 `YESULIN_PDF_AI_SLACK_RETRY_BASE_URL`에 해당 환경의 origin을 지정한다.

모델 전환은 `YESULIN_PDF_AI_MODEL_ID=global.openai.gpt-6-luna`,
`YESULIN_PDF_AI_REASONING_EFFORT=none`을 사용한다. 이 옵션을 전달하는 코드의 최초 배포가 필요하다.
이후 환경 변수만 조정할 때도 프로세스 재시작이 필요하며, 릴리스 환경 파일 직접 수정 대신
config commit/push와 config-version.txt·submodule 버전 고정 절차를 사용한다.

## 배포 절차

CodeBuild는 `buildspec.yml`로 `backend/build/deployment/` 묶음을 만들고 CodeDeploy가 EC2에 배포한다.
운영 요청은 `ALB(HTTPS 443) -> target group(HTTP 80) -> Spring Boot` 순서로 전달한다.
DEV와 PROD의 Build 액션은 각각 `DEPLOY_ENV=dev`, `DEPLOY_ENV=prod`를 명시적으로 전달한다.
빌드는 config 저장소의 `server/{DEPLOY_ENV}.env`를 선택하며 값이 없거나 다른 값이면 실패한다.
두 Pipeline 모두 `CONFIG_COMMIT_ID`와 `config-version.txt`의 일치 검증을 통과해야 한다.

공고 스케줄러는 매일 한국 시간 09:00~20:00에 10분 간격으로 실행되며 연극·퍼포먼스·뮤지컬·단원·기획사 공고만 다룬다.
PROD의 `AuditionImportScheduler`는 새 OTR 공고를 우리 공고로 검토 전 상태로 가져온 뒤 Slack으로 알린다. 운영에서 잠시 멈추려면
`YESULIN_NOTICE_SCHEDULER_ENABLED=false`를 설정한다. DEV·LOCAL은 공고를 수집·알림하지 않고 관리자 화면 `/admin/posts`에서
직접 가져온다. Slack 웹훅 `YESULIN_SLACK_WEBHOOK_URL`을 OTR 공고 알림에는 PROD에서만 쓴다. 기획사가 공고를 올리거나 고친 알림은
값이 있는 모든 환경에서 같은 웹훅으로 보내고, PROD가 아니면 메시지 앞에 `[DEV]`·`[LOCAL]`을 붙인다. `server/dev.env`에는 값이
있으므로 DEV에서 기획사 공고를 올려도 공고 채널에 `[DEV]` 알림이 간다. 웹훅이 비어 있으면 기획사 공고 알림은 로그만 남긴다.
값이 없으면 가져오기는 되지만 알림 전송이 실패해 알림 이력이 대기 상태로 남는다. 웹훅을 넣으면 다음 실행부터
한 번에 최대 100건씩 보내고, 남은 건은 그다음 실행에서 보낸다.
모든 `@Scheduled` 작업은 DB `shedlock` 테이블로 잠가(ShedLock) 인스턴스가 여러 대여도 한 곳에서만 실행한다.
공고 가져오기는 한 번에 최대 9분 잠그고 끝나도 1분은 잠금을 유지해, 서버 시각이 조금 달라도 같은 회차를 두 번 실행하지 않는다.

`KOPIS_API_KEY`(공연예술통합전산망 Open API 인증키)는 선택이다. 있으면 운영자 공연사 정보 쓰기가 KOPIS 기획제작사로 처음 값을
채우고, 없으면 KOPIS 없이 쓴다. LOCAL은 `config/server/local.env`, DEV·PROD는 SOPS 암호화된 env에 넣는다.

PDF 추출은 `YESULIN_PDF_EXTRACTION_ENABLED=true`와 32자 이상 `YESULIN_PDF_EXTRACTION_CALLBACK_SECRET`이 모두 있어야 동작한다.
두 값은 DEV·PROD 각각 `config/server/{환경}.env`에 SOPS로 넣으며 Lambda의 `PDF_COMPLETION_API_TOKEN`과 같은 값을 쓴다.
Lambda는 백엔드 도메인의 `/internal/v1/pdf-extractions/completions`로 POST하므로, 해당 도메인의 ALB 규칙이 이 경로를
프론트가 아닌 같은 환경 백엔드 target group으로 전달해야 한다. EC2에는 Nginx가 없어 저장소에서 바꿀 프록시 설정은 없다.

`YESULIN_NOTICE_LINK_BASE_URL`은 필수 환경 변수다. LOCAL은 `config/server/local.env`의
`http://localhost:3000`, DEV·PROD는 SOPS 암호화된 `config/server/dev.env`·`prod.env`의 `https://yesulin.art`를 사용한다.
PROD 알림은 가져온 공고 주소(`https://yesulin.art/posts/{id}?src=kakao_openchat`)를 바로 쓴다. 공개 전이거나 내렸으면
원문으로, 공개 뒤에는 예술in 상세로 열린다. 가져오지 못한 공고만 경유 링크 `https://yesulin.art/otr?vid={번호}&src=kakao_openchat`를
쓴다. `src`는 오픈채팅방 링크 방문 집계용 출처 표시이며, 표시 없이 예전에 공유한 링크도 계속 동작한다.
테스트용 DEV 링크는 `https://dev.yesulin.art/otr?vid={번호}`를 직접 사용한다.
환경별 YAML을 추가하지 않고 `application.yml`에서 이 변수를 읽는다. 테스트는 test resource의 값을 사용한다.
배포 환경 값은 다른 설정과 동일하게 `config/server/{환경}.env`에 SOPS로 편집하며
EC2의 복호화된 파일을 직접 수정하지 않는다. 변경한 config는 commit·push 후 `config-version.txt`와 submodule SHA를
같이 갱신한 릴리스로 배포한다. config push 전에는 버전 고정 파일을 바꾸지 않는다.
프론트의 `/otr` 페이지가 같은 origin의 `/api/v1/otr`로 이동시키고, 이 요청은 `/api/v1/:path*` rewrite로
**같은 환경의 백엔드**에 전달돼야 한다. 출처 표시가 있으면 이동 전에 브라우저가 오픈채팅방 링크 방문을 기록한다.
LOCAL은 프론트의 `API_ORIGIN=http://localhost:8080` 설정과 프론트 실행이 필요하다.
백엔드와 프론트를 함께 배포해야 짧은 공유 링크가 동작한다.
이미 발송된 Slack 메시지와 카카오 게시글의 OTR 직접 링크는 바뀌지 않는다. 배포 후 새 알림부터 적용된다.

경유 링크 이동 수는 별도 DB나 GA에 저장하지 않고 기존 HTTP 요청 로그를 집계한다. 오픈채팅방 링크 방문은 이와 별개로
공고·알림별 누적 숫자를 DB에 저장한다([API 문서](../api.md)).
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
`YESULIN_ERROR_SLACK_WEBHOOK_URL`로 보낸다. OTR 공고 알림 전송이 실패하면 공고 채널 대신 이 채널로 알린다. OTR 공고 알림 채널과 섞지 않고 환경별로 아래 채널을 쓴다.

| 변수 | LOCAL·DEV | PROD |
| --- | --- | --- |
| `YESULIN_TIMETABLE_SLACK_WEBHOOK_URL` | 로컬 및 dev용 알림 채널 | 스케줄 알림 채널 |
| `YESULIN_ERROR_SLACK_WEBHOOK_URL` | 로컬 및 dev용 알림 채널 | 버그 알림 채널 |

명함 QR과 서비스 내부 프로필 링크의 프론트 origin은 `YESULIN_EVENT_BUSINESS_CARD_BASE_URL`로 따로 지정한다.
기본값은 공고 링크 origin이며, `dev` 프로필은 공고 링크가 PROD를 가리켜도 `https://dev.yesulin.art`를 기본으로 쓴다.
다른 DEV 프론트를 쓰면 이 변수를 해당 주소로 지정한다. 기존 인쇄 QR 키와 목적지는 바꾸지 않는다.

이벤트 참가 신청 완료 알림은 `YESULIN_EVENT_REGISTRATION_SLACK_WEBHOOK_URL`에 연결된 전용 채널로 보낸다.
비어 있으면 `EVENT_REGISTERED` 로그만 남긴다. 저장 커밋 뒤 가상 스레드에서 보내며, 전송 실패는
`EVENT_REGISTRATION_SLACK_FAILED` 로그로 남기고 자동 재전송하지 않는다. 접수 데이터는 유지된다.
메시지에는 이벤트명·신청 번호·참가 구분·명함 희망 여부·관리자 명단 링크만 포함한다.
관리자 링크의 프론트 origin은 `YESULIN_EVENT_REGISTRATION_ADMIN_BASE_URL`로 지정하고, 비우면
`YESULIN_NOTICE_LINK_BASE_URL`을 쓴다. DEV 알림에서 DEV 명단을 열려면 `https://dev.yesulin.art`를 별도로 설정한다.
Slack에서 전용 채널을 만든 뒤 [공식 Incoming Webhook 안내](https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/)에 따라
해당 채널에 연결한 Webhook 주소를 환경별 서버 설정에 등록한다.

Slack 웹훅(OTR 공고 `YESULIN_SLACK_WEBHOOK_URL` 포함)은 `src/main/resources/properties/slack.yml`의 `yesulin.slack.*`로
읽고 `application.yml`이 이 파일을 import한다. DEV·PROD 값은 다른 설정과 같이 `config/server/{환경}.env`에 SOPS로 편집하고,
로컬은 Git에서 제외된 `config/server/local.env`에 둔다. 로컬과 DEV가 같은 채널을 쓰므로 메시지 앞의 `[LOCAL]`·`[DEV]`로 구분한다.

1. PR CI가 Java 25로 Checkstyle과 test를 수행하고, CodeBuild가 실행 JAR를 빌드한다.
2. JAR를 `application.jar`로 고정하고 revision과 SHA-256을 기록한다.
3. JAR와 복호화한 환경 파일을 `/opt/yesulin/releases/{commit-id}`에 함께 설치한 뒤 `current` symlink를 교체한다.
   복호화가 실패하면 `current`는 이전 릴리스를 계속 가리킨다. 롤백하면 이전 JAR와 환경 파일이 함께 선택된다.
4. systemd가 `yesulin` 사용자로 Spring을 `0.0.0.0:80`에서 실행한다. 비특권 사용자에게는
   `CAP_NET_BIND_SERVICE`만 부여한다. JVM 옵션은 환경 파일의 `JAVA_TOOL_OPTIONS`로 준다.
   DEV와 PROD 모두 `-Xmx384m`으로 힙 상한을 둔다(t4g.micro).
   `AfterInstall`의 후속 hook은 CloudWatch Agent 수집 설정을 설치한다. 권한·검증·DB 별도 설치는
   [모니터링 문서](monitoring.md)를 따른다.
5. CodeDeploy가 `http://127.0.0.1:80/actuator/health/readiness`의 HTTP 200을 확인한다.
   새 EC2의 초기 기동을 고려해 최대 420초 동안 2초 간격으로 재시도하며, 준비되면 즉시 다음 단계로 진행한다.
6. ALB target group도 같은 readiness endpoint를 확인한 뒤에만 트래픽을 전달한다.
7. 최근 릴리스 5개를 유지한다.

Blue/Green 배포 중에는 옛 버전과 새 버전이 같은 DB를 함께 쓴다. Flyway 마이그레이션은 롤백 후에도 적용된 상태로 남는다.
그래서 DB 구조는 Expand-Contract(확장-축소, Parallel Change)로 바꾼다. 한 번의 배포에서는 옛 코드가 계속 동작하는
변경(테이블·인덱스 추가, nullable이거나 default가 있는 컬럼 추가)만 한다(Expand). 컬럼·테이블 삭제, 이름 변경, 기존 컬럼의
NOT NULL·타입 변경(Contract)은 그 구조를 쓰지 않는 코드를 먼저 PROD까지 배포한 뒤 다음 배포에서 한다. dev에 모았다가
main으로 한 번에 보내므로, Contract PR은 앞 단계가 PROD에 나간 것을 확인한 뒤 dev에 병합한다.

PR CI의 `deploy/scripts/check_flyway_contract_changes.sh`는 새 마이그레이션에서 Contract 변경과 default 없는 필수 컬럼
추가를 찾으면 실패한다. 앞 단계가 PROD에 배포된 뒤라면 파일에 `-- contract: 1단계 #123이 2026-10-22 PROD에 배포됨`처럼
사유를 적어 통과시킨다. 길이만 늘리는 `modify ... not null`처럼 안전한 변경도 같은 방식으로 표시한다. 2026-10-21에 #328의 컬럼 삭제
마이그레이션 때문에 직전 버전(#327)으로의 롤백이 시작 단계에서 실패했다([검증 기록](../../../design/zero-downtime-deployment-record.md)).

테스트는 H2로 마이그레이션을 실행하므로 MySQL 고유 제한은 잡지 못한다. 특히 InnoDB 한 행의 VARCHAR 최대 바이트 합은
65,535를 넘을 수 없고 utf8mb4는 글자당 4바이트로 계산한다. 긴 글은 `VARCHAR(수천)` 대신 `TEXT`로 둔다. MySQL DDL은 문장마다
확정되므로 여러 문장 중 하나가 실패하면 앞 문장만 적용된 채 Flyway에 실패 기록이 남고, 이후 모든 배포가 시작 단계에서 멈춘다.
이때는 고친 마이그레이션을 dev에 먼저 머지하고 대기 중인 배포가 없을 때 반쯤 적용된 변경과 `flyway_schema_history`의 실패 행을
지운 뒤 다시 배포한다(2026-10-28 사례: [트러블슈팅 기록](../../../design/deploy-troubleshooting-record.md)).

### PROD Blue/Green 배포와 DEV 인플레이스 배포

아래 설정은 **2026-11-19 01:5x KST까지의 콘솔 확인·인계 기록 기준**이다. 시각의 `x`는 분 단위 원기록이
없다는 뜻이다. 배포마다 바뀌는 ASG 이름·인스턴스 ID는 고정 설정으로 사용하지 않고 CodeDeploy 배포 그룹에서 확인한다.

| 환경 | 배포 방식·현재 대상 | ASG·시작 템플릿 |
| --- | --- | --- |
| PROD | `yesulin-backend-prod-pipeline` → `yesulin-backend-prod`, EC2 Blue/Green·ASG 자동 복사 | 활성 `CodeDeploy_yesulin-backend-prod_d-9XOU1EPZL`, 원하는 1 / 최소 1 / 최대 2, `yesulin-backend-prod-lt` 버전 **6 번호 고정**, t4g.small |
| DEV | `yesulin-backend-staging`, In-place `CodeDeployDefault.AllAtOnce` | `yesulin-backend-asg`, `yesulin-backend-lt` 버전 **6 번호 고정**; 현재 서버는 버전 4로 생성됨 |
| 부하 테스트 | CodePipeline 없이 S3의 배포본을 서버에서 직접 받아 실행 | `yesulin-loadtest-asg`, `yesulin-loadtest-lt` 버전 **5 번호 고정**, t4g.small·Unlimited, 원하는 용량 0↔1 |

PROD는 평소 앱 1대이며, 배포 중에는 원본·복제 ASG의 두 세대가 함께 실행된다. 최대 2는 **각 ASG의 설정**이며
Blue/Green 전체 인스턴스 수의 상한을 뜻하지 않는다. 한 대 구성에서는 장애 후 대체 서버 준비 중 요청이 끊길 수 있다.
DEV는 유일한 인스턴스의 드레이닝·재시작 중 API가 잠시 끊길 수 있다.

PROD·DEV의 배치 후보는 app-a(`10.0.20.0/24`)·app-b(`10.0.21.0/24`), 전략은 "균형 잡힌 최선 노력"이다.
원하는 용량이 1이므로 두 AZ 중 한 곳에 1대가 뜨며, 두 AZ에서 2대를 상시 운영하는 고가용성 구성은 아니다.
부하 테스트 ASG는 DB와의 AZ 차이가 회차 비교에 섞이지 않도록 **2a 고정**을 유지한다.

- 11-18 19:55 `d-9XOU1EPZL`로 small 서버 `i-0f3887e1a68053707`에 트래픽을 넘겼다.
  공개 `/api/v1/health`를 5초 간격 24회 확인해 모두 200이었다. 이 서버는 v5로 생성됐고 이후 ASG의 선택 버전만 v6로 고정했다.
- 사양 변경 근거는 11-17 PROD 4주 관측의 swap 490~511MiB와, 11-18 같은 jar·20요청/초·350MiB 압박 3회 비교다.
  신규 small 서버의 11-18 19:10~22:01 1분 표본 170개에서 최소 가용 메모리는 약 715MiB였다.
  이 관측 구간에는 19:55 트래픽 전환 전도 포함된다. 상세 JVM 분석·설정과 비용 평가는 [PR #606](https://github.com/woowacourse-teams/2026-yesulin/pull/606) 범위다.
- 11-19 `d-QWFVMXUZL`의 복제 ASG가 두 서브넷을 이어받았고 새 서버 `i-087176a14d4490446`은 2b에 생성됐다.
  00:04 `ValidateService` 성공·DB 연결 포함 readiness 200으로 2b 기동을 확인했다. 이 배포는 아래 수동 전환 대기 만료로 중지됐다.
- DEV는 11-19 01:5x에 app-a 단독에서 두 서브넷으로 바꾸고 `Latest(6)` 대신 **6**을 지정했다.
  기존 `i-06ffa6d4f869ea6ea`는 2a에서 InService·Healthy였고 교체 활동은 없었다. 현재 서버는 v4이므로 v6 기동 검증과 혼동하지 않는다.
  DEV 템플릿은 v5부터 CPU 크레딧 Standard다. 11-18 부하 테스트의 Standard 새 서버에서 크레딧 0·CPU steal 62~82%·3분 초과 기동 지연을 관측했다.
  DEV가 교체될 때 같은 지연이 생길 가능성은 **추정이며 미확인**이다.

#### 트래픽 전환과 원본 종료

CodeDeploy가 새 ASG를 복제하고 `ValidateService`의 readiness(DB 포함) 200과 ALB 대상 상태를 검증한 뒤 트래픽을 인계한다.
11-19 01:4x에 재라우팅을 최대 1시간 **수동 대기 → 즉시**, 원본 종료 대기를 **30분 → 15분**으로 바꾸고 저장을 확인했다.
이전 "원본 계속 실행" 설정은 11-18 19:5x에 30분 뒤 종료로 변경했던 과거 상태다.

15분은 롤백 실행에 걸리는 시간이 아니라, 트래픽 전환 후 원본을 남겨 두는 종료 대기다. 이 동안 배포 경보를 감시하고
원본으로 롤백할 여유를 둔다. readiness·ALB·배포 경보가 있고 현재 사용자가 적다는 판단으로 30분에서 줄였으며,
실사용자나 트래픽이 늘면 오류 발견·대응 시간을 기준으로 재검토한다. **즉시 전환부터 15분 뒤 원본 종료까지 실제 배포가
끝까지 완료되는지는 아직 미확인**이다. 다음 main 배포에서 확인한다.

배포 그룹은 배포 실패와 연결된 CloudWatch 경보 발생 시 자동 롤백한다.
`yesulin-backend-prod-deploy-no-healthy-target`과 `yesulin-backend-prod-deploy-target-5xx`를 사용하며,
운영 알림 경보와의 구분은 [운영 경보](monitoring.md#운영-경보)를 따른다. 배포마다 공개 health와 핵심 API의 응답도 확인한다.

수동 대기 설정의 실제 실패 사례는 [PR #615](https://github.com/woowacourse-teams/2026-yesulin/pull/615)다.
11-18 23:55 문서만 main에 병합해도 운영 파이프라인이 시작됐고, 11-19 00:00 배포 `d-QWFVMXUZL`은
00:04 검증 성공 뒤 전환을 기다리다가 01:04 중지됐다. 새 서버는 트래픽 없이 남았고 기존 2a 서버가 계속 요청을 받았다.
따라서 운영 문서 변경도 **dev 대상 PR로 검토**하고, main 병합은 새 운영 배포가 시작된다는 전제로 진행한다.

#### 남은 ASG 정리와 후속 확인

11-18의 `CodeDeploy_yesulin-backend-prod_d-XHMT89IZL`·`_d-QRHTX3BYL`은 원본 계속 실행으로 남았던 micro 그룹이고,
11-19의 `_d-QWFVMXUZL`은 중지된 배포의 신규 그룹이다. 세 그룹은 삭제 전에 활성 그룹 `d-9XOU1EPZL`이 아님을 확인한 뒤
ASG·인스턴스·웜 풀 범위에서 정리했다. 시작 템플릿은 삭제하지 않았다. 정리 후 공개 응답 200과 응답 서버 `10.0.20.104` 유지를 확인했다.

원본 종료가 건너뛰어졌거나 중지된 배포가 그룹을 남기면 먼저 CodeDeploy의 활성 ASG와 ALB의 실제 정상 대상을 대조한다.
정리 대상에 운영 트래픽이 없음을 확인한 뒤 원하는·최소 용량을 0으로 내려 인스턴스 종료를 확인하고 잔여 그룹을 삭제한다.
이름이 오래됐다는 이유만으로 그룹·볼륨·시작 템플릿을 함께 지우지 않는다.

후속은 다음 main 배포의 즉시 전환·15분 종료 확인, `BeforeAllowTraffic` 핵심 API 스모크 검사 추가 검토,
운영 ASG의 **EC2 → ELB 상태 확인** 전환 검토다. 현재 EC2 상태 확인만으로는 앱만 멈춘 경우 자동 교체되지 않을 수 있다.
서비스 장애 알림과 인스턴스 자동 교체는 별개다.

앱 서버 루트 디스크가 차면 `DownloadBundle`에서 `No space left on device`로 실패하고, 그 서버에는 Session Manager도 붙지 않는다.
EC2를 직접 종료할 수 없으므로 남길 서버에 축소 보호를 걸고 ASG 원하는 용량을 한 대 늘렸다가 되돌려 그 서버만 교체한 뒤 보호를
해제한다. 실패 배포의 자동 롤백이 응답 없는 서버에 걸려 "진행 중"으로 남으면 배포 그룹이 잠기므로, 재시도 전에 그 롤백을
"배포 중지"한다(2026-10-29 사례: [트러블슈팅 기록](../../../design/deploy-troubleshooting-record.md)).

트래픽 전환 후 원본 종료 대기 중 문제가 생기면 진행 중인 CodeDeploy 배포의 중지·롤백 절차를 사용하고,
원본 종료 예약이 해소됐는지 확인한다. 원본 종료가 끝났거나 배포 완료 뒤 문제가 발견되면 직전 성공 리비전을 다시 배포한다.

1. 배포 그룹 `yesulin-backend-prod`의 배포 내역에서 되돌아갈 직전 성공 배포를 열고 "배포 복사"를 누른다.
2. 개정 위치는 그대로 두고 파일 형식 `.zip`과 되돌리는 이유를 입력한다. 배포 그룹의 Blue/Green 설정을 사용한다.
3. 교체 인스턴스가 정상이고 대상 그룹에서 트래픽을 받은 뒤 `/api/v1/health`와 핵심 API가 200인지 확인한다.
   이전 타깃을 수동 등록하는 것만으로 CodeDeploy의 원본 종료 예약이 취소되지는 않는다. 긴급 수동 복귀를 했다면
   종료 예약 해소와 운영 타깃의 Healthy 상태를 함께 확인하고, 다음 배포 전 배포 그룹이 실제 운영 ASG를 가리키는지도 확인한다.

되돌아갈 버전 이후에 컬럼·테이블 삭제 마이그레이션이 나갔다면 그 버전은 시작하지 못한다. 서버 안의 `ops/recover/rollback-release.sh`는
한 대만 바꾸고 ASG가 새로 띄우는 서버에는 반영되지 않으므로 여러 대 운영에서는 쓰지 않는다. 배포 중 실패 요청과 응답 서버는
`python ops/loadtest/deploy-availability.py --duration 1200 --out <csv>`로 기록한다.

DEV·PROD 대상 그룹은 등록 취소 후 진행 중인 요청을 60초 동안 드레이닝한다. PROD에서는 교체 인스턴스가 신규 요청을 받는다.
DEV의 인플레이스 배포에서는 이 시간 동안 신규 요청을 받을 다른 인스턴스가 없다.
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
인스턴스가 여러 대면 인스턴스마다 따로 세므로 계정별 허용 실패 횟수가 인스턴스 수만큼 늘어난다. 관리자 로그인과 CSRF가 앞에 있어
이 한계를 두고 운영하며, DB·공유 캐시 기반 제한으로 바꾸는 일은 후속 과제다.
만료 상태는 다음 삭제 확인 요청 때 정리한다. 실패 로그에는 관리자 내부 ID와 `REJECTED`/`LOCKED` 결과만 담는다.
삭제 기능 활성화 전 HTTPS, `SESSION_COOKIE_SECURE=true`, root 전용 환경 파일 권한을 확인한다.
요청 본문·DTO·Command를 로그로 남기지 않는다. 삭제 비밀번호 DTO·Command의 문자열 출력은 `[REDACTED]`로 마스킹하고,
공통 JSON 파싱·잘못된 인자 오류의 DEBUG 로그에는 예외 원문·원인을 출력하지 않는다.
HTTP 본문이나 객체를 별도로 직렬화하는 로깅은 이 마스킹으로 보호되지 않으므로 활성화하지 않는다.
위 조건의 실제 서버 적용 여부는 로컬 빌드 통과와 별도로 확인해야 한다.

세션·이메일 인증 토큰·비밀번호 재설정 토큰은 Flyway가 만드는 `SPRING_SESSION`, `SPRING_SESSION_ATTRIBUTES`,
`email_verifications`, `password_resets`에 저장되므로 인스턴스가 여러 대여도 공유된다. 배포 전에 사용하는 DB 계정에 해당 migration의 DDL 권한이 있는지 확인한다.
세션 만료는 `SESSION_TIMEOUT`의 idle timeout을 따르며 기본값은 12시간이다. 재배포는 세션 만료 사유가 아니다.
세션 속성은 JDK 직렬화 대신 JSON으로 저장한다(`SessionSerializationConfiguration`). 로그인 정보는 클래스 경로 없이
고정된 이름 `memberPrincipal`과 회원 ID·역할·상태 값으로 저장하므로 `MemberPrincipal`의 패키지·이름이 바뀌어도
기존 세션을 읽을 수 있다. 역할·상태 enum 상수 이름이나 저장 필드를 바꾸면 기존 세션을 읽지 못한다.
소셜 로그인 중 저장되는 Spring Security 값은 Spring Security Jackson 모듈이 허용한 타입만 역직렬화한다.
읽을 수 없는 세션은 `UnreadableSessionFilter`가 무효화하고 `UNREADABLE_SESSION_INVALIDATED` WARN 로그를 남기며,
사용자는 다시 로그인한다. JSON 저장을 처음 배포하면 그 전의 JDK 직렬화 세션을 읽지 못하므로 로그인 사용자는 한 번
다시 로그인한다. 이 필터가 있는 JDK 직렬화 버전으로 롤백하면 세션이 무효화될 뿐이지만, 필터가 없는 버전으로
롤백하면 그 버전은 JSON 세션을 읽지 못해 500을 내므로 롤백 직후 `DELETE FROM SPRING_SESSION;`으로 세션을 비운다.

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

새 인스턴스를 자동 생성하는 Launch Template에는 환경에 맞는 IAM Instance Profile과 Java 25·CodeDeploy Agent·
`sops` 설치 및 배포 전용 키를 포함한 AMI를 지정해야 한다. 새 인스턴스에서 키를 읽을 수 없다면 `AfterInstall`이 실패하며,
릴리스 환경 파일이 없으면 `ApplicationStart`가 실패한다.

현재 선택 버전·AZ·원하는 용량은 [환경별 배포 설정](#prod-bluegreen-배포와-dev-인플레이스-배포)을 따른다.
PROD `yesulin-backend-prod-lt` v5는 11-18 17:58에 v4를 복사해 인스턴스 유형을 t4g.small로 바꾼 버전이다.
기존 `team-bedrock-service-yesulin` Instance Profile·swap 512MiB·루트 20GiB를 유지했다.
크레딧 사양은 미지정으로 t4g 기본 Unlimited를 사용한다. DEV의 현재 Instance Profile은 이번 인계에서 **미확인**이다.

v6는 11-18 21:22에 v5 사용자 데이터에 다음 needrestart 예외를 추가한 버전이다.

```perl
# /etc/needrestart/conf.d/yesulin.conf
$nrconf{override_rc}{qr(^yesulin\.service$)} = 0;
```

11-18 20:02~20:03에는 unattended-upgrade가 libnss3 등을 갱신한 뒤 needrestart가
`systemctl restart yesulin.service`를 실행해 공개 API가 약 1~1.5분 502를 반환했다. apt history·syslog로 재시작을 확인했고
20:03:43부터 200으로 돌아왔다. 원인은 Ubuntu 내부 업데이트 후 앱 재시작이며 ASG 템플릿 버전 변경 자체가 아니다.
자동 보안 업데이트는 유지하고 **yesulin.service 재시작만 차단**한다. 갱신된 라이브러리는 다음 배포의 앱 재기동 때 반영된다.
11-19 00:00 v6로 생성된 `i-087176a14d4490446`에서 위 파일 생성을 확인했다.

ASG에는 `Latest` 대신 버전 **번호**를 지정한다. 11-18 14:58 부하 테스트 인스턴스 교체 도중 새 v5를 만들자,
`Latest`를 따르던 ASG가 실험 중 micro를 small로 바꿨다. 그 회차 측정은 폐기했으며 운영 서비스 장애는 아니었다.
번호 고정은 새 템플릿 생성과 실행 중 교체 작업이 서로 영향을 주는 것을 막고, Blue/Green 복제 ASG에도 같은 번호를 전달한다.

DEV ASG의 CodeDeploy 시작 후크가 신규 EC2에 마지막 성공 리비전을 배포하는 경로는 2026-09-22·10-09에 확인했다.
이 과거 성공은 현재 v6 교체 검증을 대신하지 않는다. 기존 DEV v4는 512MiB swap과 배포본 보관 수(`:max_revisions:`) 2를 사용했다.
인스턴스 유형·부팅 설정을 바꿀 때는 새 버전 번호와 신규 서버의 실제 설정을 함께 확인한다.

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

## 커뮤니티 신고 알림

기존 워크스페이스의 커뮤니티 신고 전용 채널을 권장하며 수신 채널은 웹훅에 연결된 채널로 정한다.
기존 공고·장애 채널 웹훅을 자동으로 재사용하지 않는다. 실제 채널 생성과 웹훅 등록·수신 확인은 별도 출시 작업이다.

| 환경 변수 | 의미 |
| --- | --- |
| `YESULIN_COMMUNITY_SLACK_WEBHOOK_URL` | 커뮤니티 신고 채널의 Incoming Webhook. 비어 있으면 전송하지 않고 DB 대기열에 유지 |
| `YESULIN_FEEDBACK_SLACK_WEBHOOK_URL` | 화면 "의견 보내기" 전용 채널의 Incoming Webhook. 변수가 없으면 `YESULIN_ERROR_SLACK_WEBHOOK_URL`(버그 알림 채널)로 보내고, 둘 다 비면 의견을 저장하고 로그만 남긴다. 빈 값으로 적어 두면 대체하지 않으므로 전용 채널을 만들기 전에는 변수를 넣지 않는다 |
| `YESULIN_COMMUNITY_LINK_BASE_URL` | 같은 환경의 프론트 origin. 예: DEV `https://dev.yesulin.art`, PROD `https://yesulin.art`. 웹훅을 설정하면 필수 |
| `YESULIN_COMMUNITY_NOTIFICATIONS_ENABLED` | 기본 true. false면 커뮤니티 알림 스케줄러만 멈추며 신고는 계속 저장 |

공고 알림의 공통 링크 주소는 DEV에서도 PROD를 가리킬 수 있으므로 커뮤니티는 전용 링크 설정을 사용한다.
값은 기존 SOPS config 배포 절차로 넣고, 웹훅 원문은 이슈·문서·로그에 기록하지 않는다.

신고 대상마다 첫 신고만 `community_reports.notification=true`로 저장한다. 5초 간격 작업이 대기 중인
알림을 최대 10개 읽고, ShedLock과 신고 행 잠금으로 중복 실행을 조정한다. 외부 HTTP 호출에는 기존
Slack 클라이언트의 연결 5초·요청 10초 제한이 적용된다. DB 트랜잭션에서 전송 결과를 기록하며 전송 실패는
30초 × 누적 시도 수(최대 1시간) 뒤 다시 보낸다. 재시도 횟수 제한은 없다.
웹훅을 나중에 설정하면 이전 대기 알림도 전송한다. 이를 원하지 않으면 운영 전 테스트 DB와 운영 DB를 구분한다.

`delivered_at`이 있으면 전송 완료, `notification=true`이면서 없으면 대기/재시도다. `attempts`,
`next_attempt_at`과 `COMMUNITY_REPORT_NOTIFICATION_FAILED reportId=... attempts=...` 로그로 확인한다.
HTTP 성공 뒤 DB 커밋 실패나 응답 유실에서는 중복 수신될 수 있으며 Slack 메시지의 신고 ID로 구분한다.
메시지에는 환경·대상 종류/ID·공개 링크·사유 분류·접수 시각만 보낸다. 자유 설명·본문·브라우저 비밀값은 보내지 않는다.

출시 전에 해당 환경에서 첫 신고 수신, 추가 신고의 무알림, 실패 후 재전송을 확인한다.
현재 자동 테스트는 외부 전송을 대체하며 실제 Slack 수신을 검증하지 않는다.
