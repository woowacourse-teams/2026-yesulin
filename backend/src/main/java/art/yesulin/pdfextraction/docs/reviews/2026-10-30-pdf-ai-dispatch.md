# PDF AI 커밋 후 즉시 실행

작업 ID: `2026-10-30-pdf-ai-dispatch`. 평가표 v1. 구현 전 기준이며 결과는 검증 후 추가한다.

| ID | 필수 | 흐름·실패 조건 | 기대 결과 | 검증 방법 |
| --- | --- | --- | --- | --- |
| D01 | 예 | 콜백/AI enqueue 트랜잭션 커밋·롤백 | 커밋 후에만 비동기 실행 신호, 콜백 안에서는 모델 호출 없음 | 실제 트랜잭션과 이벤트 리스너 통합 테스트 |
| D02 | 예 | 중복 콜백·SKIPPED | 새 PENDING 작업만 신호, 중복 모델 실행 억제는 기존 DB claim 유지 | DB enqueue/중복/skip 테스트 |
| D03 | 예 | 대량 신호·처리 중 새 신호 | 노드 동시성 제한, 신호를 무한 메모리 큐에 쌓지 않음, 대기 작업 연속 처리·호출 간격 후 다음 슬롯 깨우기 | dispatcher 동시성·중간 신호·예약 병합 테스트 |
| D04 | 예 | 모델 오류·신호 유실·서버 재시작 | 기존 DB 재시도/lease/요청 간격 유지, 주기 실행으로 재개 | 기존 큐·lease 테스트, 워커 실패 뒤 재실행 테스트 |
| D05 | 예 | 종료·executor 거절 | 커밋된 콜백을 실패 응답으로 바꾸지 않음, 주기/다른 노드에서 회수 가능 | dispatcher 종료·거절 테스트 |
| D06 | 예 | PDF 심사·배우 가져오기 | 기존 목적별 enqueue·결과·수동 편집 보호 | 기존 PDF/Audit/배우 application 테스트 |
| D07 | 예 | 출력 JSON·토큰 상한·분석 이벤트 | 기존 출력 계약과 성공 이벤트 의미 보존; 상한 근거와 미측정 범위 구분 | 프롬프트/파서 테스트·어댑터·분석 정의 확인 |
| D08 | 예 | 정리·독립 평가 | 옛 실행자 중복 제거, 변경분 미사용 점검, 독립 평가 1회 | diff·참조 검색·독립 평가 |

실제 AWS 쿼터·모델 호출·운영 배포는 별도 미확인이다. 기존 미커밋 Audit 이벤트 핸들러 변경은 보존한다.

## 구현과 범위

- `PdfAiQueueService.enqueue`: 새 PENDING 작업만 `PdfAiQueuedEvent` 발행. 외부 콜백/목적별 처리와 같은 트랜잭션이다.
- `PdfAiQueuedEventHandler`: AFTER_COMMIT에서 Dispatcher에 신호만 전달한다. 모델/DB claim은 별도 가상 스레드다.
- `PdfAiDispatcher`: 실행 수를 노드 concurrency 이내로 제한하고 반복 신호를 합친다. 새 신호와 종료 경계는 동기화와
  신호 버전으로 보호한다. 획득 가능한 작업을 이어서 처리하고 제한·빈 큐에서는 종료한다.
- 기존 Scheduler는 같은 Dispatcher에 주기 신호를 보낸다. 기존 노드당 1건 고정 실행자·busy 플래그는 제거했다.
- 전역 DB gate·lease·재시도 분류는 유지했다. 처음에는 기존 호출량 기본값을 유지했고, 사용자가 분당 300회라고
  확인한 뒤 concurrency=4, request-interval=PT0.2S로 기본값을 조정했다. 기존 환경 변수는 우선한다.
- 사용자의 Lambda 동시성 질문에 따라 AI concurrency 허용 범위를 1~50으로 확장했다. 기본값은 4다.
  양수 요청 간격에서는 신호당 새 실행자를 하나만 추가하고 성공한 claim의 다음 예약으로 슬롯을 채운다.
- `PdfAiClaimedEvent`도 획득 트랜잭션의 AFTER_COMMIT에만 전달된다. Dispatcher는 다음 요청 간격 뒤 신호를
  노드당 하나로 병합 예약한다. 마지막 획득 이후 간격을 지키고 빈 큐에서 자체 예약을 계속하지 않는다.
  대량 작업이 호출 간격에 걸렸다고 5초 주기 신호까지 기다리지 않도록 하는 보완이다.
- 프롬프트/파서/AI 출력 계약과 API는 변경하지 않았다. Bedrock 4096, 로컬 Gemini 6000 출력 토큰 상한의 차이와
  대표 표본에 의한 충분성 측정이 없다는 점을 정책에 명시했다. 모델 API의 JSON Schema 강제는 현재 사용하지 않는다.
- `frontend/docs/analytics.md`의 PDF 성공 관측 기준과 `frontend/scripts/posthog/dashboards.mjs`의 PDF/심사 집계를
  확인했다. 브라우저가 결과를 관측하는 성공 지점·operation_id·집계 분모·전송 데이터는 이번 변경에서 바꾸지 않았다.

## 검증 결과

기존 미커밋 `AuditExtractionEventHandler.java`는 존재하지 않는 Audit 이벤트 타입을 참조한다.
이를 수정하거나 정상으로 간주하지 않았다. 선행 문제 ID는
`2026-10-30-pdf-reliability-review-F04`이며 OPEN 상태다. 신규 결함 건수에 중복 집계하지 않는다.

검증 복사본: `/var/folders/r_/w5y2qkqd4m1f878ywb838jkm0000gn/T/yesulin-pdf-ai-dispatch-vsqyir47/backend`.
원본의 모든 신규/수정 Java 소스·테스트가 복사본과 바이트 단위로 같은 것을 확인했다.
복사본의 위 Audit 핸들러 한 파일만 HEAD 버전으로 대체했다. 원본 핸들러의 변경 전/후 SHA-256은 동일하다:
`0e6abde46a95fb19be669cf25069311ec25f183d1cd17017b37a6203bd70535e`.

- 격리본에서 `./gradlew --offline test --tests 'art.yesulin.pdfextraction.*' --tests 'art.yesulin.audit.*' --tests 'art.yesulin.actor.application.profileimport.*' checkstyleMain checkstyleTest` 통과(21초).
- 전역 동시성 상향 테스트 추가 후 `./gradlew --offline test --tests 'art.yesulin.pdfextraction.application.ai.*' checkstyleMain checkstyleTest` 통과(9초).
  AI 패키지 33개: Dispatcher 6, QueueService DB 12, Worker 2, Prompt 2, ResponseParser 11; 실패/오류 0.
  세 경쟁 워커의 전역 동시성=2/간격=0 조건에서 정확히 2건만 획득함을 확인했다.
- 커밋 전 신호 없음·커밋 후 1회·롤백 시 작업과 신호 없음·중복/실패 추출 SKIPPED 신호 없음은 실제 H2 트랜잭션과
  운영 이벤트 리스너를 불러오는 application DB 테스트로 확인했다. 외부 모델은 호출하지 않는다.
- Dispatcher의 300개 신호 병합·동시성·연속 처리·처리 중 신호·오류 후 재개·실행 거절·종료를 검증했다.
- `git diff --check` 통과. 원본 작업 트리는 기존 핸들러 문제로 전체 빌드 통과 상태가 아니다.
- 300RPM·예약 신호 추가 전 전체 격리 빌드: `./gradlew --offline build`, 2분 20초, 1,356개/229 suites,
  실패·오류·skip 0. 예약 신호 추가와 아래 스타일 수정 후 전체 격리 빌드도 통과했다(2분 27초,
  1,361개/229 suites, 실패·오류·skip 0). 1~50 설정 범위의 최종 변경은 별도 최종 실행 결과로 아래에 기록한다.
- 최종 소스의 `./gradlew --offline build` 통과: 2026-10-30T10:11:07+09:00 종료, 2분 27초,
  1,362개/229 suites, 실패·오류·skip 0. checkstyleMain/checkstyleTest와 실행 JAR 빌드 포함.
  Dispatcher 10개·QueueService DB 14개가 포함된다. 최종 Java 변경 11개와 YAML이 원본/격리본에서 동일하다.

### 실제 AWS 조회 범위

2026-10-30 오전 10시 6분 KST, 로그인된 AWS 콘솔에서 Dev `yesulin-pdf-benchmark-dev`의 동시성 구성을
읽었다. 함수 예약 동시성은 없고 예약되지 않은 계정 공용 동시성 표시가 2,490이었다. 프로비저닝 구성은 0이다.
이는 함수의 전용 보장 2,490건이나 계정 내 다른 함수의 설정을 뜻하지 않는다. 50건 예약 제한은 이 함수에서 확인되지 않았다.
Lambda 추출 코드에는 파일당 최대 50페이지 제한이 있다. AWS 설정은 수정하지 않았다.
CLI는 자격 증명이 없어 조회 실패했고 콘솔 읽기로 대체했다. 토큰·키·환경 변수 값은 읽거나 기록하지 않았다.
이 조회로 실제 모델 호출·배포된 Spring 동작·부하가 검증된 것은 아니다.

## 독립 평가와 집계

별도 읽기 전용 에이전트의 독립 평가 1회 수행. 현재 제공된 독립 평가 수단으로 같은 종류의 에이전트를 사용했다.
새 결함은 발견하지 않았다. 커밋 경계·신호 경합·종료·전역 제한·재시도와 신규 클래스 소비 경로를 확인했다.
기존 Scheduler 실행자 제거도 확인했고 미사용 신규 코드·설정·의존성은 발견하지 않았다.
독립 평가 뒤 추가한 전역 동시성 DB 테스트는 표적 검증으로 통과했다. 이후 사용자의 300RPM 확인으로
호출량 기본값과 획득 후 예약 신호를 추가했으며, 이 추가 부분은 같은 평가자의 표적 검토와 실행 검증으로 확인한다.

평가표 D01~D08: PASS 8 / FAIL 0 / UNVERIFIED 0 / N/A 0 (격리본의 명시된 로컬 검증 범위).
신규 발견 1 / 해결 1 / 미해결 0; P0 0 / P1 0 / P2 0 / P3 1. 오탐 0.
PRECHECK 0 / INDEPENDENT_REVIEW 0 / POST_FIX_CHECK 1 / EXTERNAL 0.
선행 OPEN 1건(F04)은 별도 참조이며 이번 작업의 발견·해결 건수에 넣지 않는다.
위 Dev 동시성 조회를 제외한 실제 운영 설정·모델 호출·300건 부하·현재 WIP 전체 컴파일은 이 PASS의 대상이 아니다.
PR은 생성하거나 갱신하지 않았다.

### 문제와 추가 전용 사건 이력

`2026-10-30-pdf-ai-dispatch-F01`: P3/TEST/INTRODUCED, POST_FIX_CHECK, FIXED.
새 rollback 테스트의 jobId 선언과 사용 사이가 Checkstyle 허용 거리를 넘었다. 테스트 식별자를 final로 선언했고
전체 격리 빌드의 checkstyleMain/checkstyleTest 통과로 해결을 확인했다. 최초 PR은 PENDING이다.

| 사건 ID | 문제 ID | 사건 | 발생 시각(+09:00) | 근거 / PR |
| --- | --- | --- | --- | --- |
| E01 | 2026-10-30-pdf-ai-dispatch-F01 | CONFIRMED | 2026-10-30T10:04:39+09:00 | checkstyleTest VariableDeclarationUsageDistance / PENDING |
| E02 | 2026-10-30-pdf-ai-dispatch-F01 | FIXED | 2026-10-30T10:07:05+09:00 | final 선언, 전체 격리 빌드 통과 / PENDING |
