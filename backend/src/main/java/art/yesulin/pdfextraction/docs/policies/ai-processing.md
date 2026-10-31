# AI 실행·상한·검증 정책

작업 상태는 `PENDING → RUNNING → COMPLETED`, 일시 실패는 `PENDING`으로 복귀하고
영구 실패·최대 시도 횟수 소진은 `FAILED`다. 기본은 총 3회 시도이며 재시도 간격은 15초, 30초로 늘어난다.
429·네트워크 시간 초과·5xx는 재시도하고 권한·모델 설정 오류는 영구 실패한다.
잘못된 출력은 아래 dev 모델 승격 조건을 만족할 때 한 번 보정하며, 그 외는 영구 실패한다.
잘못된 모델 출력이나 경력/프로필의 원문 근거 불일치는 `INVALID_MODEL_OUTPUT`으로 기록한다.

`pdf_ai_worker_gate`의 한 행을 잠근 트랜잭션에서 유효한 RUNNING 수를 세고 작업을 획득한다.
기본 전체 상한은 4건이며 서버별 스레드 수로 전체 상한을 판단하지 않는다.
커밋 뒤 즉시 실행 신호와 주기 실행은 같은 Dispatcher를 사용한다. ShedLock은 주기 신호만 조정하며,
실제 전역 실행권은 DB Gate/lease가 소유한다. 전용 실행자는 노드에서도 concurrency 설정(1~50) 이하로만 실행하고
콜백 수만큼 메모리 작업을 쌓지 않는다. 처리 중 새 신호는 합쳐서 확인한다. 모델 호출은 HTTP 콜백 스레드와 분리한다.
새 작업 이벤트는 AFTER_COMMIT에만 전달되며, 신호 유실·실행자 거절·서버 재시작은 기본 5초 주기 신호로 회수한다.
작업 획득 커밋 뒤에는 다음 요청 간격에 신호 하나를 예약해 비어 있는 슬롯을 채운다. 예약은 노드당 하나로 합치며
새 획득이 있으면 마지막 획득 이후 간격을 지킨다. 빈 큐에는 예약을 이어 만들지 않는다.
호출 간격이 양수면 신호 하나당 새 실행자도 하나만 시작해, 동시성 상한이 커도 예약 신호마다
수십 개의 실행자가 같은 DB gate를 조회하지 않도록 한다. 0 간격을 명시한 경우에는 빈 슬롯을 함께 깨운다.
모델 호출 기한은 Bedrock 35초이며 임대는 최소 2분이다. 임대 만료 작업은 다음 tick에서 복구하고
임대 토큰이 바뀌었거나 만료된 이전 작업자의 응답은 반영하지 않는다.
임대는 논리적 실행권이므로 프로세스 장기 정지나 응답 유실에서 모델 호출 자체의 정확히 한 번 실행·과금을 보장하지 않는다.
동시성 제한은 모델의 RPM/TPM 쿼터를 대신하지 않는다.
사용자가 확인한 분당 300회 기준으로 기본 요청 간격은 전체 서버 합산 0.2초(최대 300RPM)이며
gate의 `next_request_at`을 같은 트랜잭션에서 예약한다. 재시도도 간격을 다시 획득한다.
`YESULIN_PDF_AI_REQUEST_INTERVAL=PT0.2S`로 설정하며,
dev는 계정 할당량 재확인 전 보수적인 `PT1S`(전체 모델 합산 최대 1RPS/60RPM)를 기본값으로 사용한다.
이미 설정한 환경 변수는 기본값보다 우선한다.
요청 간격 제한은 정확한 TPM 제한을 대신하지 않는다. 시계가 동기화된 서버를 전제로 하며 계정 쿼터를 관찰해 조정한다.

기능이 꺼져 있거나 텍스트가 없거나 32,000자를 넘으면 SKIPPED로 종료하고 원문·규칙 결과는 유지한다.
추출 자체가 FAILED이면 AI를 호출하지 않는다. 원문/배역 스냅샷이 손상된 작업은 `INVALID_SOURCE`로 종료해
대기열 전체가 같은 작업에서 멈추지 않도록 한다.
비활성 중 SKIPPED 처리된 과거 작업을 켜는 것만으로 자동 재분석하지 않는다.
모든 필드는 불확실하면 null이고 원문을 대신하는 합격 판단은 하지 않는다.

설정: `YESULIN_PDF_AI_ENABLED`(base/local false, dev·prod는 PDF 기능 활성 시 기본 true), `YESULIN_PDF_AI_PROVIDER`(bedrock),
`YESULIN_PDF_AI_MODEL_ID`(초기값 `global.openai.gpt-6-luna`), `YESULIN_PDF_AI_REGION`(ap-northeast-2),
`YESULIN_PDF_AI_CONCURRENCY`(4, 허용 1~50), `YESULIN_PDF_AI_MAX_ATTEMPTS`(3, 허용 1~5).
로컬 `local` 프로필에서만 provider=gemini와
`yesulin.pdf-ai.gemini-api-key-file`과 Gemini 모델 ID를 명시해 기존 Gemini 검증을 사용할 수 있다.
Bedrock 오류 시 Gemini로 자동 우회하지 않는다.

현재 Bedrock 기본 설정은 `global.openai.gpt-6-luna`, reasoning effort는 `none`이다.
Dev EC2의 실제 지원서 Converse 실험은 확인했고, 변경 코드의 배포와 Prod 역할 검증은 별도로 수행한다.
다른 Converse 지원 모델은 `YESULIN_PDF_AI_MODEL_ID`로 지정한다.
서울(`ap-northeast-2`) endpoint를 사용하지만 글로벌 추론 프로필이므로 실제 추론 위치를 서울로 한정하지 않는다.
출력 상한은 Bedrock 4096 tokens(상수), 로컬 Gemini 6000 tokens다. Bedrock Luna와 Haiku 5.5는 temperature를 생략한다.
실제 Luna Converse에서 temperature=0은 HTTP 400으로 거부되어 사용하지 않는다.
`YESULIN_PDF_AI_REASONING_EFFORT`는 none(기본), low, medium, high, xhigh, max 중 하나다.
Luna와 Sol은 additionalModelRequestFields.reasoning.effort로 전달한다. Haiku 5.5는 none일 때 thinking.type=disabled,
그 외는 adaptive와 output_config.effort를 전달한다. 다른 모델은 기존처럼 추가 추론 옵션을 생략한다.
이는 생성량을 제한하는 현재 설정이며 대표 지원서의 출력 토큰 분포·최대 필드 길이로 충분성을 입증한 값은 아니다.
출력이 잘리면 부분 JSON을 반영하지 않고 INVALID_MODEL_OUTPUT으로 종료한다. 상한 조정은 실제 출력 사용량과
잘림 빈도를 측정한 뒤 판단한다. 요청 수 상한(RPM), 입력/출력 토큰 처리량(TPM), 출력 토큰 상한은 서로 다른 제한이다.
동시 실행 기본 4건은 초기 실행 수 설정이며 300RPM의 실제 달성을 보장하지 않는다. 평균 모델 응답시간과
입력/출력 토큰 처리량에 따라 실제 처리 속도가 달라진다. 배포 환경에 기존 환경 변수 값이 있으면 기본값보다 우선한다.
예를 들어 평균 10초/호출이라면 초당 5회 시작에 필요한 동시성은 약 50건이다. 이는 설정 산식이며 실측값이 아니다.
`YESULIN_PDF_AI_CONCURRENCY=50`으로 조정할 수 있다. PDF 추출 Lambda의 동시성은 이 설정과 독립이다.
확인한 계정/모델 쿼터에 맞춰 YESULIN_PDF_AI_CONCURRENCY와 YESULIN_PDF_AI_REQUEST_INTERVAL을 조정한다.
이 설정을 늘려도 전역 DB 상한은 모든 서버에 합산 적용된다.
모델 지원·역할 허용과 서비스 처리량은 별개다. Gemini보다 높은 정확도나 더 짧은 시간을 보장하지 않는다.
모델별 접근·쿼터는 대상 EC2 역할과 모델 ID로 확인한다.

배포는 서버를 비활성 상태로 먼저 배포하고, EC2에서 모델 ID·리전·InvokeModel 권한을 확인한 뒤 Spring AI를 켠다.
기존 Lambda의 완료 AI 결과는 중복 처리하지 않는다.
서버에 같은 enabled/model 설정이 적용된 것을 확인하고 추출 전용 Lambda와의 콜백을 검증한다.
전환 권장 순서다. 2026-10-29 Dev Lambda는 추출 전용으로 이미 전환했다. Spring 변경분은 아직 미배포이며 전체 경로를 검증한 상태가 아니다. 레거시 콜백 수신은 유지하고 이전 모델 문맥 조회 엔드포인트는 제거한다.

활성화 전에는 실제 Dev EC2의 실행 역할로 합성 문장 한 건을 호출해 확인한다. 콘솔 사용자에게 역할 조회 권한이
없다는 사실만으로 실행 역할의 호출 가능 여부를 판단하지 않는다. `AccessDenied`라면 AI를 끈 채로 유지한다.
기존 EC2 역할을 Bedrock 팀 역할로 즉시 교체하면 S3·배포·SSM 권한이 사라질 수 있으므로,
인프라 담당자와 기존 기능 권한을 보존하는 연결 방식을 먼저 정한다. 현재 SDK는 기본 자격 증명 체인만 사용하며
`team-bedrock-service-yesulin` 역할을 자동으로 AssumeRole하지 않는다.
글로벌 추론 프로필과 해당 프로필이 전달할 수 있는 리전의 기반 모델에 대한 `bedrock:InvokeModel` 허용이 필요하다.
권한 확인 후 새 합성 PDF 작업을 업로드해 `PENDING → COMPLETED`와 프로필 반영을 확인한다.
비활성 상태에서 이미 SKIPPED가 된 작업은 이 검증을 대신하지 않는다.

## dev 실험용 응답 DEBUG

사용자 요청에 따라 `dev`가 활성이고 `prod`는 비활성인 경우에만 `PdfAiDiagnostics`가 모델 응답 텍스트를
DEBUG 구조화 필드 `aiResponse`에 기록한다. prod·dev+prod·local·무프로필에서는 로그 수준을 DEBUG로 바꿔도 기록하지 않는다.
Bedrock 응답의 종료 상태·본문 검증 전에 기록하므로 `max_tokens` 등으로 거부한 응답도 확인할 수 있다.
`PDF_FLOW stage=AI_PROVIDER_RESPONSE`의 jobId, `stopReason`, `inputTokens`, `outputTokens`로 호출을 연결한다.
요청 원문·시스템 프롬프트·API 키·헤더는 추가 기록하지 않는다. 모델 응답에는 지원자 정보가 포함될 수 있다.
과대 응답은 최대 131,072자로 제한하며 `responseCharacters`와 `responseTruncated`로 기록 잘림을 표시한다.
`PDF_FLOW stage=AI_FAILURE_DETAIL`은 JSON 형식, 이름·배역 근거, 프로필 스키마/근거 등 검증 실패 지점을 구분한다.
DB 오류 코드 `INVALID_MODEL_OUTPUT`은 유지한다. 모델 승격 조건은 다음 절을 따른다.
CloudWatch dev 필터는 기존 `PDF_FLOW ` 접두사로 수집한다. 필터 적용 전 로컬 파일만 기록된 응답은 CloudWatch에 소급 전송하지 않는다.

## 어댑터와 검증 범위

 큐·재시도·결과 반영은 [AI 흐름](../flows/ai-enrichment.md)가 맡고, 여기는 모델 호출만 한다.

| 어댑터 | 등록 조건 | 비고 |
| --- | --- | --- |
| `BedrockPdfAiClient` | `dev` 또는 `prod` 프로필, `yesulin.pdf-ai.enabled=true`, `provider=bedrock` | Bedrock Converse API. 기본 Luna, dev 검증 실패 승격은 Sol. |
| `GeminiPdfAiClient` | `local` 프로필, enabled=true, `provider=gemini` | 로컬 전용. API 키는 환경 변수 또는 키 파일로 받으며 저장소에 두지 않는다. |

- 로컬은 기존 `application-local.yml`과 `local` 프로필로 LocalStack Lambda와 Spring Gemini를 함께 쓴다.
- 프로필 없이 `provider=gemini`로 켜면 Gemini 어댑터가 없어 AI 클라이언트 빈이 만들어지지 않는다.
- 호출 실패는 `PdfAiFailure`(`PROVIDER_ERROR`/`GEMINI_HTTP_<상태>`/`INVALID_MODEL_OUTPUT`, 재시도 가능 여부)로 변환한다. 429·408·5xx·모델 타임아웃은 재시도 대상이다.
- Bedrock 오류를 Gemini로 자동 우회하지 않는다.

## 남은 검증

- 2026-10-29 Dev EC2 역할의 서울 `InvokeModel` 재시험: Haiku 5.5와 GPT-6 Luna 모두 HTTP 200, OK 응답.
  최초 권한 거부 뒤 재시험이 성공했다. Prod 역할과 배포된 Spring Converse 경로의 실제 호출은 별도 확인이 필요하다.
- 응답 형식은 프롬프트와 응답 파서(`PdfAiResponseParser`)로 검증한다. Gemini는 JSON MIME 타입만 지정하고 스키마 강제는 쓰지 않는다.

## 실패 알림과 수동 재분석

최종 FAILED 커밋 뒤 Slack 알림을 비동기로 보낸다. 일시 실패의 자동 재시도 중에는 보내지 않는다.
알림에는 환경·작업 ID·모델·오류 코드·시도 횟수만 포함하며 지원자 이름·파일명·원문·응답은 넣지 않는다.
Slack 전송 실패는 작업 상태를 되돌리지 않고 PDF_AI_SLACK_ALERT_FAILED 로그로 남긴다.
알림은 best-effort이며 프로세스 종료나 Slack 장애 중의 전송을 영속 큐로 보장하지 않는다.

공연사 심사의 유효한 실패 작업에는 AI 재분석 요청 URL 버튼을 넣는다. 클릭은 현재 환경의
`/pdf-ai/retry` 확인 화면을 열 뿐이며 GET·링크 미리보기로 작업을 실행하지 않는다. 사용자가 로그인한 뒤
재분석 실행을 눌러 기존 세션·CSRF 보호 POST를 보낸다. 본인 작업의 Active Producer 또는 Active Admin만 가능하다.
Slack Signing Secret·Interactivity 수신 경로는 사용하지 않는다. LOCAL 링크는 기본 localhost:3000,
DEV는 dev.yesulin.art, PROD는 yesulin.art다. 다른 프론트는 YESULIN_PDF_AI_SLACK_RETRY_BASE_URL로 지정한다.

FAILED인 같은 실패 세대·시도·실패 시각을 AI 행 잠금 아래 확인하고 PENDING으로 바꾼다.
retry_generation을 증가시키므로 시계나 시도 횟수가 같아져도 이전 알림으로 다시 실행할 수 없다.
중복 클릭은 이미 처리 중으로 응답하고, 완료·생략·원본 추출 실패·삭제·배우 가져오기·원문 없음은 재등록하지 않는다.
기존 callback payload·배역 스냅샷을 유지하고 새 재시도 묶음의 attempts는 0부터 시작한다.
재등록·화면 ENRICHING 반영은 같은 트랜잭션이며 커밋 뒤 기존 Dispatcher를 깨운다.
성공/실패/재등록 변경은 기존 소유자 SSE에도 알리고 재조회 시 DB 상태로 동기화한다.
담당자의 수동 배역·메모·판정은 보존한다.

알림 채널의 환경 설정은 [배포 문서](../../../../../../../../docs/operations/deployment.md)가 정본이다.

## dev 검증 실패 승격과 요청량 보호 (2026-10-31)

기본/운영/로컬은 새 승격·서킷을 기본 비활성화하고 dev에서만 기본 활성화한다. Haiku로 quota를 우회하지 않는다.
`PdfAiFailure.qualityRejected()`의 허용 목록에 든 JSON 형식·필드 스키마·원문 근거 오류만
Luna→Sol로 한 번 승격한다. 허용된 null은 정상이다. 토큰 상한/빈 응답/과대 응답/입력 손상,
권한·네트워크·429는 품질 승격 대상이 아니다. 검증 통과가 모든 필드의 의미 정확도를 보장하지는 않는다.
Sol도 같은 원문·배역·프롬프트·파서로 처리한다. Sol 검증 실패는 최종 실패이며 다른 모델로 다시 돌리지 않는다.
이미 승격된 작업은 설정을 꺼도 Sol 선택을 유지한다. 이 설정은 새 승격만 막는다.

Luna는 기존 `none`/4096, Sol은 명시적 `low`/8192로 시작한다. Sol 토큰 예산은 추론과 JSON 출력을 위한
실험값이며 충분성·정확도 개선은 아직 실측하지 않았다. temperature는 생략한다.
승격 시 Luna 한 번을 보정 묶음으로 처리하여 attempts를 1 돌려주고, Sol의 일시 실패는 기존 백오프/상한을 따른다.
max-attempts=3이면 자동 물리 호출은 작업 세대당 최대 4회다. 실제 과금/호출 수는 attempts와 다르다.
수동 재분석은 새 retry_generation으로 구분하고 Luna부터 다시 시작한다.

`pdf_ai_model_circuits`의 모델별 행은 전역 gate 아래 생성하고 비관적 잠금으로 공유한다.
실제 quota 거부(RATE_LIMITED) 연속 3회면 OPEN 60초, 실패한 탐색마다 120/240/300초로 늘린다.
ModelNotReady의 429는 quota로 분류하지 않는다. 이 서킷은 quota 전용이며 5xx·권한 오류의 포괄적인 차단 장치는 아니다.
OPEN에서는 외부 호출/작업 시도 횟수를 소비하지 않고, 시간이 되면 HALF_OPEN 탐색 1개만 2분 lease로 허용한다.
재시작·서버 증설에도 DB 상태를 공유하고 오래된 세대 응답은 무시한다. 응답이 quota 거부가 아니면 서킷을 닫는다.
스케줄러는 계속 DB를 조회하므로 CALL_SKIPPED는 유일 작업 수나 절약 과금액이 아니다.
호출량은 모든 모델·재시도를 합산한 DB gate가 제한한다. 쿼터가 알려지면 요청 간격을 조정한다.
RPS는 모델별 TPM·공통 일일 토큰 상한을 대신하지 않으며 서킷도 첫 거부를 예방하지 못한다.

| 환경 변수 | 기본값 / 의미 |
| --- | --- |
| `YESULIN_PDF_AI_ESCALATION_ENABLED` | dev true, 그 외 false / 신규 품질 승격 |
| `YESULIN_PDF_AI_ESCALATION_MODEL_ID` | `global.openai.gpt-6-sol` |
| `YESULIN_PDF_AI_ESCALATION_REASONING_EFFORT` | `low` |
| `YESULIN_PDF_AI_ESCALATION_MAX_TOKENS` | 8192 / 허용 4096~32768 |
| `YESULIN_PDF_AI_CIRCUIT_ENABLED` | dev true, 그 외 false |
| `YESULIN_PDF_AI_CIRCUIT_FAILURE_THRESHOLD` | 3 / 허용 1~50 |
| `YESULIN_PDF_AI_CIRCUIT_OPEN_DURATION` | PT60S / 최소 1초 |
| `YESULIN_PDF_AI_CIRCUIT_MAX_OPEN_DURATION` | PT5M / 초기 차단 이상, 최대 1시간 |

측정 정의·실험 결과·Logs Insights 쿼리는 [평가 기록](../reviews/2026-10-31-model-resilience.md)을 따른다.
모델별 InvokeModel 권한과 실제 Sol 응답은 dev 배포 후 확인한다. 현재 계정의 적용 RPM/TPM은 미확인이다.
