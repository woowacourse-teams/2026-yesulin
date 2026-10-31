# PDF 업로드·AI 실행 구조 검토

작업 ID: `2026-10-30-pdf-reliability-review`. 평가 시각: 2026-10-30T09:42:39+09:00.
대상: `yesulin-pdf-upload-extraction`, HEAD `3c3c42a0`와 기존 미커밋 이벤트 핸들러 변경.
요청은 취약점·개선안 검토다. 업무 코드·설정·기존 변경은 수정하지 않았다. AWS 조회·배포·실제 모델 호출은 하지 않았다.

## 평가표 v1

구현 변경 없는 검토 작업이다. 아래 기준으로 정적 검토와 기존 테스트 실행을 구분했다.
공통·PDF·Audit 도메인 규칙과 흐름·정책을 읽고 별도 읽기 전용 에이전트의 독립 평가 1회를 수행했다.
독립 평가 도구의 별도 연결은 없어 같은 종류의 별도 에이전트를 사용했다. 평가자의 재귀 평가는 하지 않았다.

| ID | 필수 | 흐름·실패 조건 / 기대 결과 | 방법·결과 |
| --- | --- | --- | --- |
| R01 | 예 | 정상 업로드는 S3 목록 스캔 없이 시작 | PASS — `s3_handler.py:15-58`, ObjectCreated → 추출 → 콜백; AI만 DB 주기 처리 |
| R02 | 예 | 성공 AI 작업 제외, 일시 실패만 제한된 재시도 | PASS(정적) — QueueService.claim의 PENDING 조회, PdfAiJob의 3회/15·30초 기본, Bedrock SDK 재시도 비활성 |
| R03 | 예 | 콜백 최종 유실 뒤 작업 회수 가능 | FAIL — F01; 정책도 최종 유실 복구 미구현을 명시 |
| R04 | 예 | 같은 이벤트 동시 도착 시 추출 실행 중복 억제 | FAIL — F02; 캐시 읽기/쓰기가 원자적이지 않음 |
| R05 | 예 | 모델 성공 뒤 반영 실패는 모델 재호출 없이 복구 | FAIL — F03; 모델 호출과 저장/이벤트 반영이 같은 try에 있음 |
| R06 | 예 | 현재 작업 트리의 이벤트 연결과 컴파일 유효 | FAIL — F04; compileJava의 누락 타입 오류 6개 |
| R07 | 예 | 실제 배포 환경의 실패 목적지·재시도·전체 흐름 | UNVERIFIED — AWS 설정/모델 미조회, Java 테스트 컴파일 차단, Python 추출 의존성 미설치 |
| R08 | 예 | 300건 처리량·복구 시간 | UNVERIFIED — 부하 시험 없음; 아래 시간은 설정으로 계산한 하한 |
| R09 | 아니오 | 수동 판정·메모·배역 보호 회귀 | N/A — 동작 변경 없음; 기존 코드만 확인 |
| R10 | 아니오 | 신규 코드·설정·의존성의 미사용 정리 | N/A — 신규 구현 없음; 기록 파일만 추가. 기존 WIP 이벤트 불일치는 F04에 포함 |

필수 PASS 2 / FAIL 4 / UNVERIFIED 2 / N/A 2. 필수 검증률 2/8=25%이며 운영 품질 점수가 아니다.
P1 미해결과 실제 실행 미확인이 있으므로 구현·운영의 정상 완료로 판정하지 않는다.

## 확정 문제

모든 문제의 최초 기록 PR은 `PENDING`, 해결 시각은 없음이다. F01은 정책에 이미 알려진 공백을 이번 검토에서 문제 ID로 기록한 것이며, 이번 변경이 도입한 결함이 아니다.

| 문제 ID 접미사 | 심각도/유형/유입 | 경로 | 상태 | 근거·개선안 |
| --- | --- | --- | --- | --- |
| F01 | P1/FLOW/EXISTING | PRECHECK | OPEN | `ops/pdf-extraction-lambda/src/infrastructure/completion_api.py:48-53`, `PdfExtractionService.java:114-122`: 콜백 실패는 Lambda 예외지만 최종 실패를 회수하는 소비자/재처리 경로가 없음. DELAYED는 표시뿐. 실패 목적지 또는 DLQ와 재처리, 오래된 미완료 작업 점검 필요. 실제 AWS 목적지 유무는 미확인 |
| F02 | P2/CODE/EXISTING | PRECHECK | OPEN | `ops/pdf-extraction-lambda/src/application/jobs.py:73-111`: 동시 실행이 둘 다 캐시 부재를 보고 추출·업로드 가능. Spring 멱등성은 추출 비용을 막지 않음. 실행권/lease로 중복 작업 억제; 조건부 최종 캐시 저장은 결과 일관성을 위한 별도 조치 |
| F03 | P2/FLOW/EXISTING | PRECHECK | OPEN | `PdfAiWorker.java:29-37`, `PdfAiQueueService.java:125-127`: 모델 성공 뒤 DB/리스너 실패도 PROCESSING_ERROR 재시도로 모델부터 실행. 유효 모델 응답의 영속 저장과 소비 기능 반영 단계를 분리해 반영 재시도에 응답 재사용 |
| F04 | P1/CODE/EXISTING | PRECHECK | OPEN | `audit/presentation/event/AuditExtractionEventHandler.java:4-6`: 기존 미커밋 변경이 존재하지 않는 Audit 전용 이벤트 3개를 참조. 공용 이벤트 발행자와 불일치하며 compileJava 실패. 기존 작업 중 변경은 보존하고 소유자가 연결을 정리해야 함 |

발견 4 / 해결 0 / 미해결 4. P0 0 / P1 2 / P2 2 / P3 0. 오탐 0.
PRECHECK 4 / INDEPENDENT_REVIEW 0 / POST_FIX_CHECK 0 / EXTERNAL 0.
독립 평가자는 F01~F04를 모두 확인했다. 최초 발견 뒤 같은 문제를 독립 평가가 재확인한 것은 신규 발견에 더하지 않았다.

### 추가 전용 상태 사건

| 사건 | 문제 ID | 종류 | 최초 확정 시각(+09:00) | 근거 / 최초 PR |
| --- | --- | --- | --- | --- |
| E01 | 2026-10-30-pdf-reliability-review-F01 | CONFIRMED | 2026-10-30T09:42:39+09:00 | 최종 콜백 복구 경로 미구현; 정책·코드·독립 평가 / PENDING |
| E02 | 2026-10-30-pdf-reliability-review-F02 | CONFIRMED | 2026-10-30T09:42:39+09:00 | 캐시 check-then-write; 코드·독립 평가 / PENDING |
| E03 | 2026-10-30-pdf-reliability-review-F03 | CONFIRMED | 2026-10-30T09:42:39+09:00 | 모델/반영 실패 경계; 코드·독립 평가 / PENDING |
| E04 | 2026-10-30-pdf-reliability-review-F04 | CONFIRMED | 2026-10-30T09:42:39+09:00 | compileJava 오류 6개·독립 평가 / PENDING |

## 실행 근거와 한계

- `backend`: `./gradlew --offline test --tests 'art.yesulin.pdfextraction.*' --tests 'art.yesulin.audit.application.AuditExtractionServiceTest'` → compileJava 실패(F04). 테스트 본문은 실행되지 않았다.
- `ops/pdf-extraction-lambda`: `PYTHONPATH=src python3 -m unittest discover -s tests/application -v` → 콜백 조립·전송·레거시 호환 7개 PASS. 추출/이미지 분류의 2개 모듈은 `pypdfium2` 미설치로 import ERROR. 전체 추출 테스트 성공으로 간주하지 않는다. 시스템 Python 3.9였으며 Lambda 대상은 Python 3.12다.
- 업로드의 파일명·25MiB 상한·조건부 PUT, 소유권 조회, 전용 콜백 토큰, 원본/결과 prefix 분리, 추출 페이지/이미지 자원 상한을 정적으로 확인했다. 권한 침해나 개인정보 유출을 실제 재현한 검토는 아니다.
- 기존 평가 기록의 테스트 통과 수를 이번 실행 결과로 사용하지 않았다. 부하·모델 정확도·배포 상태는 미확인이다.

## 구조 제안

현재: 브라우저 → S3 ObjectCreated → Lambda(PDF 추출) → Spring 콜백/DB AI 작업 → 주기 워커 → AI → DB/심사 반영.
Lambda는 AI를 호출하지 않는다. 스케줄러는 S3 객체 목록이 아닌 DB PENDING 작업을 조회한다.

최소 변경안은 콜백 커밋 직후 기존 제한된 DB 워커를 깨우고, 주기 실행을 재시도·중단 복구 안전망으로 유지하는 것이다.
HTTP 콜백 안에서 AI를 동기 실행하지 않는다. 콜백 타임아웃 10초와 Bedrock 전체 기한 35초가 충돌할 수 있다.
즉시 실행 신호는 프로세스 중단으로 유실돼도 DB 대기 작업과 주기 워커가 회수하도록 한다.

현재 전역 요청 간격 기본 10초, 전역 동시성 기본 1이다. AI 대상 300건이 이미 준비됐어도 300번째 호출 시작은
최초 호출로부터 최소 299×10=2,990초(약 50분) 뒤다. 모델 지연·tick·재시도는 추가된다. 이는 실제 측정값이 아니다.
즉시 신호는 초기 tick 대기만 줄이며, Lambda로 AI 호출을 옮겨도 계정 RPM/TPM 쿼터가 사라지지 않는다.

추출 입력의 장애 보존·대량 업로드 제어가 필요하면 S3 → SQS → 추출 Lambda와 DLQ/재처리를 추가한다.
SQS 배치에는 ReportBatchItemFailures를 구현/설정해 실패 메시지만 재시도한다. 현재 S3 핸들러를 그대로 연결할 수는 없다.
Lambda로 AI까지 옮기는 경우에도 추출/AI/통지의 단계별 결과 저장, 전역 호출 제한, 심사 배역 스냅샷·수동 수정 보호가 필요하다.
같은 원본을 새 jobId로 다시 올리는 중복은 현재 별개 작업이다. 원본 SHA 중복 정책을 도입한다면 소유자/심사 범위와 모델·프롬프트 버전을 함께 고려한다.

참고: [Lambda 비동기 재시도](https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-error-handling.html),
[S3 이벤트 전달](https://docs.aws.amazon.com/AmazonS3/latest/userguide/EventNotifications.html),
[SQS 부분 실패 처리](https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html).
AWS 문서의 기본값은 실제 함수에 적용된 설정을 입증하지 않는다.

## 후속 변경 연결 — 2026-10-30

위의 동시성 1·10초 간격·약 50분 계산은 이 기록의 최초 검토 시점 기준이다.
이후 사용자가 분당 300회라고 확인한 내용을 반영한
[커밋 후 AI 실행 변경](2026-10-30-pdf-ai-dispatch.md)에서 기본값을 동시성 4·0.2초 간격으로 바꿨다.
커밋 직후 실행과 획득 후 다음 신호 예약도 추가했다. 실제 배포 환경 변수와 처리량은 별도 확인 대상이다.
이 연결은 위 F01~F04의 해결 사건을 뜻하지 않는다. 기존 사건·최초 시각과 미해결 상태는 보존한다.
