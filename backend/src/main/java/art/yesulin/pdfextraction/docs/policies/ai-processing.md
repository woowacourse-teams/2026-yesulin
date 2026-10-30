# AI 실행·상한·검증 정책

작업 상태는 `PENDING → RUNNING → COMPLETED`, 일시 실패는 `PENDING`으로 복귀하고
영구 실패·최대 시도 횟수 소진은 `FAILED`다. 기본은 총 3회 시도이며 재시도 간격은 15초, 30초로 늘어난다.
429·네트워크 시간 초과·5xx는 재시도하고 권한·모델 설정·잘못된 출력은 영구 실패한다.
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
요청 간격 제한은 정확한 TPM 제한을 대신하지 않는다. 시계가 동기화된 서버를 전제로 하며 계정 쿼터를 관찰해 조정한다.

기능이 꺼져 있거나 텍스트가 없거나 32,000자를 넘으면 SKIPPED로 종료하고 원문·규칙 결과는 유지한다.
추출 자체가 FAILED이면 AI를 호출하지 않는다. 원문/배역 스냅샷이 손상된 작업은 `INVALID_SOURCE`로 종료해
대기열 전체가 같은 작업에서 멈추지 않도록 한다.
비활성 중 SKIPPED 처리된 과거 작업을 켜는 것만으로 자동 재분석하지 않는다.
모든 필드는 불확실하면 null이고 원문을 대신하는 합격 판단은 하지 않는다.

설정: `YESULIN_PDF_AI_ENABLED`(base/local false, dev·prod는 PDF 기능 활성 시 기본 true), `YESULIN_PDF_AI_PROVIDER`(bedrock),
`YESULIN_PDF_AI_MODEL_ID`(초기값 `global.anthropic.claude-haiku-5-5`), `YESULIN_PDF_AI_REGION`(ap-northeast-2),
`YESULIN_PDF_AI_CONCURRENCY`(4, 허용 1~50), `YESULIN_PDF_AI_MAX_ATTEMPTS`(3, 허용 1~5).
로컬 `local` 프로필에서만 provider=gemini와
`yesulin.pdf-ai.gemini-api-key-file`과 Gemini 모델 ID를 명시해 기존 Gemini 검증을 사용할 수 있다.
Bedrock 오류 시 Gemini로 자동 우회하지 않는다.

현재 Bedrock 기본 설정은 `global.anthropic.claude-haiku-5-5`다. Dev EC2 InvokeModel 성공은 확인했고, 배포 Spring Converse·Prod 역할 검증은 남아 있다.
다른 Converse 지원 모델은 `YESULIN_PDF_AI_MODEL_ID`로 지정한다.
서울(`ap-northeast-2`) endpoint를 사용하지만 글로벌 추론 프로필이므로 실제 추론 위치를 서울로 한정하지 않는다.
출력 상한은 Bedrock 4096 tokens(상수), 로컬 Gemini 6000 tokens이며 temperature는 Bedrock에서 강제하지 않는다.
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
DB 오류 코드 `INVALID_MODEL_OUTPUT`, 영구 실패 판정·재시도 횟수·출력 토큰 상한은 유지한다.
CloudWatch dev 필터는 기존 `PDF_FLOW ` 접두사로 수집한다. 필터 적용 전 로컬 파일만 기록된 응답은 CloudWatch에 소급 전송하지 않는다.

## 어댑터와 검증 범위

 큐·재시도·결과 반영은 [AI 흐름](../flows/ai-enrichment.md)가 맡고, 여기는 모델 호출만 한다.

| 어댑터 | 등록 조건 | 비고 |
| --- | --- | --- |
| `BedrockPdfAiClient` | `dev` 또는 `prod` 프로필, `yesulin.pdf-ai.enabled=true`, `provider=bedrock` | Bedrock Converse API. 모델 ID는 설정(`model-id`)이며 기본은 Haiku. dev·prod 대상. |
| `GeminiPdfAiClient` | `local` 프로필, enabled=true, `provider=gemini` | 로컬 전용. API 키는 환경 변수 또는 키 파일로 받으며 저장소에 두지 않는다. |

- 로컬은 기존 `application-local.yml`과 `local` 프로필로 LocalStack Lambda와 Spring Gemini를 함께 쓴다.
- 프로필 없이 `provider=gemini`로 켜면 Gemini 어댑터가 없어 AI 클라이언트 빈이 만들어지지 않는다.
- 호출 실패는 `PdfAiFailure`(`PROVIDER_ERROR`/`GEMINI_HTTP_<상태>`/`INVALID_MODEL_OUTPUT`, 재시도 가능 여부)로 변환한다. 429·408·5xx·모델 타임아웃은 재시도 대상이다.
- Bedrock 오류를 Gemini로 자동 우회하지 않는다.

## 남은 검증

- 2026-10-29 Dev EC2 역할의 서울 `InvokeModel` 재시험: Haiku 5.5와 GPT-6 Luna 모두 HTTP 200, OK 응답.
  최초 권한 거부 뒤 재시험이 성공했다. Prod 역할과 배포된 Spring Converse 경로의 실제 호출은 별도 확인이 필요하다.
- 응답 형식은 프롬프트와 응답 파서(`PdfAiResponseParser`)로 검증한다. Gemini는 JSON MIME 타입만 지정하고 스키마 강제는 쓰지 않는다.
