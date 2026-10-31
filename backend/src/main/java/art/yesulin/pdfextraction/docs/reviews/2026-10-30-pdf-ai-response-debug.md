# dev AI 응답 진단

작업 ID `2026-10-30-pdf-ai-response-debug`, PDF 평가표 v1 + 응답 진단 기준 v1, 평가일 2026-10-30.
사용자는 dev 실험을 위해 DEBUG에 AI 응답 원문 기록을 명시적으로 요청했다.

## 구현 전 평가 기준

| ID | 필수 | 기대 결과·실패 경계 | 검증 |
| --- | --- | --- | --- |
| D01 | 예 | dev + DEBUG에서 제공자 종료 사유·토큰 수·응답 텍스트 기록. 잘린 응답·검증 실패도 보존 | 로컬 합성 응답·로그 캡처 |
| D02 | 예 | prod, dev+prod, local, 무프로필은 DEBUG를 강제로 켜도 응답 미기록 | 프로필별 로그 캡처 |
| D03 | 예 | jobId로 연결하고 요청 원문·시스템 프롬프트·키·헤더를 추가 기록하지 않음. 과대 응답 상한·잘림 표시 | MDC 복원·구조화 로그 검사 |
| D04 | 예 | JSON·필드·근거 검증의 실패 지점 구분, 기존 오류 코드·재시도·결과 반영 유지 | 기존 파서·워커 테스트 및 이유 검사 |
| D05 | 예 | CloudWatch dev 기존 PDF_FLOW 수집식과 호환, 문서·참조·미사용 점검과 독립 평가 1회 | 필터 테스트·diff·독립 검토 |

실제 모델 재호출·개인 PDF 실험·배포는 이 변경의 로컬 검증 범위 밖이다.

## 결과

D01~D05 PASS 5 / FAIL 0 / UNVERIFIED 0 / N/A 0 (코드·로컬 합성 검증 기준).
Diagnostics 4 / Parser 12 / Worker 3 총 19개 테스트 통과. Checkstyle Main/Test 통과.
실제 BedrockPdfAiClient를 사용하는 임시 Java 프로브에서 합성 SDK 응답을 반환시켜
max_tokens 응답의 원문·종료 사유·사용량을 검증 전 기록하고, 같은 응답을 prod에서는 DEBUG에서도 기록하지 않는 것을 확인했다.
정상 응답 반환·4096 출력 상한·INVALID_MODEL_OUTPUT/비재시도 의미는 유지됐다. 외부 요청·실제 모델 호출은 없었다.
독립 읽기 전용 평가 1회 완료. 신규 지적·미사용 경로 없음. 요청 원문·프롬프트·헤더·키는 추가 기록하지 않는다.
실제 dev 배포·CloudWatch 수집·개인 PDF 실험은 미실시다.

발견 1 / 해결 1 / 미해결 0. P0 0 / P1 0 / P2 0 / P3 1.
PRECHECK 0 / INDEPENDENT_REVIEW 0 / POST_FIX_CHECK 1 / EXTERNAL 0, 오탐 0.

| 문제 ID | 심각도·유형·유입 | 경로 | 최초 확정(+09:00) / 최초 PR | 조치·상태 |
| --- | --- | --- | --- | --- |
| 2026-10-30-pdf-ai-response-debug-F01 | P3/CODE/INTRODUCED | POST_FIX_CHECK | 2026-10-30T14:57:32+09:00 / #466 | 파서 줄 길이 122자 Checkstyle 위반을 줄바꿈으로 수정. FIXED, Main/Test 재검사 통과 |

## 추가 전용 상태 이력

| 사건 | 문제 ID | 종류 | 시각(+09:00) | 근거 |
| --- | --- | --- | --- | --- |
| E01 | 2026-10-30-pdf-ai-response-debug-F01 | CONFIRMED | 2026-10-30T14:57:32+09:00 | 19개 테스트 통과 후 Checkstyle Main의 122자 위반 확인 / 최초 PR #466 |
| E02 | 2026-10-30-pdf-ai-response-debug-F01 | FIXED | 2026-10-30T14:57:32+09:00 | 역할 근거 검증 호출 줄바꿈. Checkstyle Main/Test 재실행 통과 |
