# 모델 승격·호출 보호 평가표

- 작업 ID: `2026-10-31-pdfextraction-model-resilience`, 평가표 v2 (사용자 요청으로 제한→Haiku 전환을 폐기).
- dev 대상. 이전 운영 릴리스 작업은 크루가 main에 반영했으므로 이번 변경에 섞지 않는다.
- 기본 경로는 Luna. 형식/원문 근거 검증 실패만 Sol로 1회 승격한다. 정상 null, 잘림, 입력 손상, 429는 승격하지 않는다.
- Sol도 DB 큐를 통해 전체 호출 간격을 획득한다. 재시도 중 선택 모델은 유지한다. dev 기본 1RPS, 동시성 4.
- 연속 제한 3회, 최초 차단 60초, 재실패 시 최대 300초까지 늘리고 반개방 탐색은 DB에서 모델별 하나만 허용한다.
- 이 수치는 구현 기본값이며 모델/계정의 실제 RPM·TPM 할당량으로 주장하지 않는다.

| ID | 흐름 / 실패 조건 | 기대 결과 / 검증 | 필수 |
| --- | --- | --- | --- |
| R01 | 정상/null·형식/근거 불일치·429·잘림 | Luna 정상 종료, 검증 실패만 Sol 1회, 나머지는 기존 재시도/최종 실패 | 예 |
| R02 | 승격 후 일시 오류·메타데이터 | Sol 유지, 실제 모델 기록, 명시적 low/8192, 무한 승격 없음 | 예 |
| R03 | 두 모델 제한·재시작·여러 서버 | 모델별 공유 상태, 차단 중 호출/시도 소모 없음, 반개방 1개·오래된 응답 무시 | 예 |
| R04 | 호출 증폭·복구·lease·차단된 선두 | 전체 호출 간격·상한, 유한 재시도·만료 복구, Sol 대기열 기아 방지 | 예 |
| R05 | 운영 지표·개인정보·롤백 | 물리 호출/확정 결과/토큰 구분, 원문·응답·비밀 미기록, 커밋 후 상태 지표 | 예 |
| R06 | 성과 근거 | 정상/단일 제한/전체 제한 후 복구를 같은 입력·부하·장애 시간으로 비교, 실제 측정과 모의 결과 구분 | 예 |
| R07 | 정리·회귀·문서·평가 | 기존 목적/수동 판정/롤백 보존, 미사용 설정·코드·문서 점검, 독립 평가 1회 | 예 |

## 할당량 근거

현재 계정의 모델별 RPM·TPM·공통 일일 토큰 상한은 미확인이다. 300RPM은 이전 사용자 관찰에 따른 애플리케이션 상한이다.
AWS 공식 문서는 runtime의 모델별 TPM·일부 모델의 RPM 및 계정/리전 공통 일일 상한을 구분한다.
공통 일일 상한이 소진되면 모델 전환도 실패할 수 있으므로 두 모델 차단을 함께 검증한다.

- https://docs.aws.amazon.com/bedrock/latest/userguide/quotas-runtime.html
- https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-openai-gpt-6-sol.html
- https://developers.openai.com/api/docs/models/gpt-6-sol

Service Quotas 조회는 `ListAWSDefaultServiceQuotas` 권한 거부로 계정 적용값을 확인하지 못했다.
서킷은 실패 후 반응하며 최초 오류를 예방하지 못한다. 형식/원문 근거 검사는 의미 정확도 전체를 보장하지 않는다.
Sol의 실제 PDF 개선율과 비용은 별도 표본 평가가 필요하다.

## 검증 결과

2026-10-31 독립 읽기 전용 평가 1회 완료. 별도 종류의 평가 도구를 사용할 수 없어 독립된 별도 에이전트로 대체했다.
필수 R01~R07: PASS 7 / FAIL 0 / UNVERIFIED 0 / N/A 0 (아래 로컬 범위에 한정).
실제 Sol 접근·PDF 의미 정확도·계정 할당량·dev 배포·CloudWatch 수집·운영 성능/비용은 별도 미확인이다.

| 항목 | 근거 |
| --- | --- |
| R01 | PdfAiFailureTest: 정상 null과 형식/근거 허용 목록, 잘림·빈 응답·429 제외 |
| R02 | QueueServiceDatabaseTest: 승격 1회·sticky Sol·실제 modelId 저장. 로컬 SDK HTTP probe: none/4096, low/8192, temperature 생략 |
| R03 | PdfAiModelCircuitTest: 세대·단일 탐색·지수 차단·만료 탐색. DB 동시 claim/공유 행 테스트 |
| R04 | DB gate·승격/재시도 간격·상한·만료 lease·선두 차단/두 모델 독립 복구 테스트, 기존 수동 입력 보호 회귀 |
| R05 | 커밋/롤백 지표·원문 제외 DB 테스트, 잘림 RESPONSE_REJECTED Worker 테스트, 캐시 토큰 로컬 SDK probe |
| R06 | 정상 10건 대조 [완료10,t=9] 동일, 90초 거부 장애 대조, 두 모델 동시 차단 후 독립 복구 |
| R07 | 전체 build 성공, 수정 후 PDF 테스트·Checkstyle 성공, 모니터링 8개·Flyway 순서/호환 검사 성공, 독립 평가 1회 |

전체 build `./gradlew build`: SUCCESS (2분39초). 지표 수정 뒤 PDF 범위·Checkstyle 및 직접 로컬 SDK HTTP 확인을 다시 실행했다.
SDK probe는 임시 Java 실행 파일로 실제 SDK를 로컬 HttpServer에 연결하고 가짜 자격 증명만 사용했다.
Luna/Sol JSON 요청·토큰 예산·temperature 미전송, Throttling/ModelNotReady 429 구분, 403·max_tokens 분류,
캐시 읽기50/쓰기20 별도 로그·원문 미기록을 확인했다. 실제 AWS 요청/과금 검증은 아니다.
CloudWatch 쿼리는 실행 예시이며 실제 dev 쿼리 실행/데이터 수집은 아직 확인하지 않았다.
임시 node_modules 링크와 probe 파일은 제품 커밋에서 제외한다. 기본 String generate 계약은 local Gemini 소비자가 사용한다.

### 문제 현황과 추가 전용 사건 이력

신규 발견 2 / 해결 2 / 미해결 0; P0 0 / P1 0 / P2 2 / P3 0.
경로 PRECHECK 0 / INDEPENDENT_REVIEW 2 / POST_FIX_CHECK 0 / EXTERNAL 0. 오탐 0.
후보 검토 후 구현자가 아래 시각에 확정·수정 결과를 기록했다. 최초 기록 PR은 생성 후 연결한다.

| 문제 ID | 심각도·유형·유입 | 발견 경로 | 최초 확정(+09:00) / 최초 PR | 해결 시각(+09:00) | 근거·조치·수정 후 검증 |
| --- | --- | --- | --- | --- | --- |
| 2026-10-31-pdfextraction-model-resilience-F01 | P2/CODE/INTRODUCED | INDEPENDENT_REVIEW | 2026-10-31T19:17:24+09:00 / PENDING | 2026-10-31T19:18:30+09:00 | TOKEN_USAGE 캐시 입력 누락. cacheRead/cacheWrite 별도 필드·집계 추가, 로컬 SDK 캐시50/20 확인. FIXED |
| 2026-10-31-pdfextraction-model-resilience-F02 | P2/CODE/INTRODUCED | INDEPENDENT_REVIEW | 2026-10-31T19:17:24+09:00 / PENDING | 2026-10-31T19:18:30+09:00 | HTTP 성공의 잘림/빈 응답을 일반 오류로 혼합. RESPONSE_REJECTED 분리·계약 정정, Worker 지표 테스트 PASS. FIXED |

| 사건 ID | 문제 ID | 종류 | 시각(+09:00) | 근거·관련 PR |
| --- | --- | --- | --- | --- |
| E01 | 2026-10-31-pdfextraction-model-resilience-F01 | CONFIRMED | 2026-10-31T19:17:24+09:00 | 독립 평가: 캐시 사용량 누락 / PENDING |
| E02 | 2026-10-31-pdfextraction-model-resilience-F02 | CONFIRMED | 2026-10-31T19:17:24+09:00 | 독립 평가: 응답 수신과 본문 거부 혼합 / PENDING |
| E03 | 2026-10-31-pdfextraction-model-resilience-F01 | FIXED | 2026-10-31T19:18:30+09:00 | SDK 로컬 HTTP 캐시 로그 표적 확인 / PENDING |
| E04 | 2026-10-31-pdfextraction-model-resilience-F02 | FIXED | 2026-10-31T19:18:30+09:00 | PdfAiWorkerTest 표적 확인 / PENDING |

## 재현 가능한 장애 실험

2026-10-31 로컬 JDK 25/H2 MySQL mode, 실제 `PdfAiQueueService`·Flyway·DB gate·서킷 사용.
테스트 `controlledNinetySecondOutageMeasuresProtectionAgainstExhaustedRetries`에서 같은 10건을 t=0에 enqueue하고
MutableClock을 1초씩 전진시킨다. 각 t마다 claim 1회, t<90이면 합성 RATE_LIMITED, 이후 즉시 유효 결과로 complete한다.
두 실행 모두 1RPS·동시성 1·최대 시도 3·15/30초 백오프이며 서킷 활성 여부만 다르다.
실제 Bedrock 호출·PDF 의미 정확도·서버 CPU/메모리 부하는 측정하지 않는다. 애플리케이션의 복구 정책 실험이다.

| 시나리오 | 실제 호출 함수 진입 | quota 거부 | 최종 완료 | 최종 실패 | 마지막 종료 시각 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 서킷 비활성 | 30 | 30 | 0/10 | 10/10 | t=54초 (모두 실패) |
| 서킷 활성 | 14 | 4 | 10/10 | 0/10 | t=191초 |

동일 조건에서 거부 호출은 `(30-4)/30=86.7%`, 전체 호출은 `(30-14)/30=53.3%` 감소했다.
장애 해제 t=90 이후 첫 성공은 t=182, 마지막 성공 t=191이다. 기다림이 늘어나는 비용을 숨기지 않는다.
54초 실패 종료를 성공 처리 시간 개선으로 비교하지 않는다. 운영 가용성·실측 MTTR·과금 절감으로 일반화할 수 없다.
정상 10건은 t=0~9초에 모두 완료하고 매초 추가 claim은 gate에 막히는 것을 별도 테스트로 확인한다.

이력서에 현재 쓸 수 있는 표현: “계정 쿼터가 불명확한 비동기 AI 처리에 DB 공유 호출 제한·서킷을 도입하고,
동일 90초 429 장애 주입 실험에서 거부 호출을 30회→4회로 줄이며 재시도 소진 10건을 완료로 복구했다.”
‘운영 오류율 87% 개선’이라고 쓰려면 실제 dev/운영 관측의 동일 부하·기간·표본이 추가로 필요하다.

## 운영 측정 계약 v1

INFO `event=PDF_AI_RESILIENCE`는 일반 JSON 로그다. CloudWatch Agent 다음 배포 hook에서 dev/prod 필터에 포함한다.
원문·모델 응답·파일명·이름·소유자 ID·비밀은 넣지 않는다. 기존 dev 응답 DEBUG와 별도 이벤트다.
PostHog 제품 이벤트의 성공 의미와 분모는 바꾸지 않는다. 브라우저 관측 완료율과 서버 작업 완료율을 섞지 않는다.

| kind/outcome | 의미와 분모 |
| --- | --- |
| PROVIDER_RESULT | SDK generate 시도 결과 1회. SUCCESS는 정상 종료의 비어 있지 않은 본문 반환이며 형식/근거/DB 성공이 아님. RESPONSE_REJECTED는 잘림/빈 응답 등 HTTP 성공 응답 거부. RATE_LIMITED/전체 결과로 quota 거부율 계산 |
| TOKEN_USAGE | Bedrock usage가 있는 응답의 input/output/totalTokens·cacheReadInputTokens·cacheWriteInputTokens. 실패 요청의 누락 usage를 0으로 간주하지 않음 |
| JOB_STATE / VALIDATION_REJECTED | 커밋된 형식/근거 검증 거부. 실제 의미 정확도 점수가 아님 |
| JOB_STATE / ESCALATION_QUEUED | Luna 검증 실패 후 Sol 재등록. 최초 승격 기준 분모 |
| JOB_STATE / ESCALATION_CLAIMED | Sol 획득. Sol 일시 재시도마다 발생하므로 unique jobId+generation으로 중복 제거 |
| JOB_STATE / COMPLETED, FAILED | 결과 반영/최종 실패 트랜잭션 커밋 뒤 기록. 롤백은 기록하지 않음 |
| CIRCUIT_STATE | 모델별 OPEN/HALF_OPEN/CLOSED 전이. OPEN→CLOSED 시간과 공급자 정상화 이후 탐색 지연은 별개 |
| CALL_SKIPPED | 서킷으로 후보 호출을 건너뛴 판단 횟수. scheduler 중복 조회 포함, 유일 작업/절약 호출/절약 비용으로 간주 금지 |

작업 코호트는 jobId+generation이다. 재분석은 새 세대, 자동 재시도는 같은 세대다.
완료율은 같은 코호트의 완료/(완료+최종실패)로 계산하고 아직 대기 중인 수를 따로 표시한다.
승격 복구율은 승격 재등록 코호트 중 Sol 완료 비율이며 관측 기간 끝의 미완료를 따로 표시한다.
JOB_STATE elapsedMs는 최초 작업 생성부터의 시간(수동 재시도 대기 포함)이다. 재시도 세대별 latency로 오해하지 않는다.
프로세스가 응답/커밋 직후 죽으면 로그가 유실될 수 있다. 정산·완전한 감사 원장으로 쓰지 않고 DB 최종 상태와 대조한다.
비용은 모델별 input/output/cache read/cache write 토큰과 해당 시점 Bedrock 단가로 추정하고,
완료 건당 값에 실패·승격 비용도 포함한다. inputTokens를 모든 캐시 토큰을 포함한 총입력으로 간주하지 않는다.
totalTokens와 cache 필드의 포함 관계도 제공자별 사용량 정의를 확인하고 중복 합산하지 않는다.
usage 누락·캐시 할인·세금·요금제 차이가 있어 청구서와 동일한 값으로 주장하지 않는다.

Logs Insights에서 `/yesulin/dev/backend`와 동일한 실험 기간을 선택한다.

```sql
filter event = 'PDF_AI_RESILIENCE' and kind = 'PROVIDER_RESULT'
| stats count(*) as calls, pct(elapsedMs, 50) as p50Ms,
    pct(elapsedMs, 95) as p95Ms by modelId, outcome
```

```sql
filter event = 'PDF_AI_RESILIENCE' and kind = 'JOB_STATE'
    and outcome in ['COMPLETED', 'FAILED']
| stats latest(outcome) as finalOutcome, latest(escalated) as usedEscalation by jobId, generation
| stats count(*) as jobs by finalOutcome, usedEscalation
```

```sql
filter event = 'PDF_AI_RESILIENCE' and kind = 'TOKEN_USAGE'
| stats sum(inputTokens) as reportedInput, sum(outputTokens) as output,
    sum(cacheReadInputTokens) as cacheRead, sum(cacheWriteInputTokens) as cacheWrite,
    sum(totalTokens) as reportedTotal by modelId
```

```sql
filter event = 'PDF_AI_RESILIENCE' and kind in ['CIRCUIT_STATE', 'CALL_SKIPPED']
| stats count(*) as decisions by kind, modelId, state, bin(1m)
```

실제 Sol PDF 표본의 정답 대조와 계정 적용 할당량은 UNVERIFIED다. 과거 Luna/Haiku 1 PDF 실험을 Sol 성과로 재사용하지 않는다.
