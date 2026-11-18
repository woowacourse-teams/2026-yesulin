# 관리자 인증 메일 요청 모니터링 평가

- 작업 ID `2026-11-15-auth-admin-email-monitoring`
- 평가일 2026-11-15, 인증 평가표 v1
- 독립 평가 1회. Claude CLI가 없어 별도 읽기 전용 평가자를 사용했다. [PR #587](https://github.com/woowacourse-teams/2026-yesulin/pull/587)

| ID | 시나리오 | 기대 결과와 검증 근거 | 필수 | 판정 |
| --- | --- | --- | --- | --- |
| M01 | 정상 요청과 재시도 | 기존 세션·CSRF·POST/PATCH를 유지하고 요청마다 유효한 `X-Request-Id`를 보냄. `api.test.ts`와 호출 경로 점검 | Y | PASS |
| M02 | 네트워크와 5xx 실패 | 같은 요청 ID로 Sentry 보고 1회. 보고용 예외에는 주소·인증번호·응답·원본 예외 없음. UI에 기존 오류를 전달. `api.test.ts`, `report-error.test.ts` | Y | PASS |
| M03 | 4xx와 요청 취소 | 401·403·409·AbortError의 모니터링 호출 0회. `api.test.ts` | Y | PASS |
| M04 | 통합과 정리 | 관리자 컴포넌트와 MSW의 API 호출 계약을 확인하고 미사용 항목·깨진 신규 링크를 점검. 프론트 표적 테스트 47개, ESLint, Webpack 프로덕션 빌드 통과 | Y | PASS |
| M05 | 운영 수집 | 실제 배포에서 Sentry 수신과 같은 요청 ID로 백엔드 로그를 찾는 경로 | N | UNVERIFIED |

## 문제와 집계

| 문제 ID | 심각도·유형·유입 | 발견 경로 | 상태 | 근거와 조치 | 최초 확정 | 최초 PR | 해결 시각 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-11-15-auth-admin-email-monitoring-F01 | P3 · CODE · INTRODUCED | EXTERNAL | FIXED | 재전송 네트워크·5xx 오류가 화면 안내로만 처리됐다. 회원 변경 요청 경계에서 두 실패 유형을 공통 모니터링에 보고하고 테스트했다. [리뷰 의견](https://github.com/woowacourse-teams/2026-yesulin/pull/587#discussion_r4577965913) | 2026-11-15T19:16:21+09:00 | #587 | 2026-11-15T19:38:44+09:00 |
| 2026-11-15-auth-admin-email-monitoring-F02 | P3 · POLICY · INTRODUCED | EXTERNAL | FIXED | 재전송에서 브라우저 요청 ID를 보내지 않던 동작을 코드로 확인했다. 기존 헤더 생성기를 사용하고 Sentry와 같은 ID를 쓰는지 테스트했다. [리뷰 본문](https://github.com/woowacourse-teams/2026-yesulin/pull/587#pullrequestreview-5910209843) | 2026-11-15T19:36:49+09:00 | #587 | 2026-11-15T19:38:44+09:00 |

| 사건 ID | 문제 ID | 사건 | 발생 시각 | 근거·PR |
| --- | --- | --- | --- | --- |
| 2026-11-15-auth-admin-email-monitoring-F01-E01 | 2026-11-15-auth-admin-email-monitoring-F01 | CONFIRMED | 2026-11-15T19:16:21+09:00 | 관리자 요청 실패 보고 누락 · #587 |
| 2026-11-15-auth-admin-email-monitoring-F02-E01 | 2026-11-15-auth-admin-email-monitoring-F02 | CONFIRMED | 2026-11-15T19:36:49+09:00 | 재전송 fetch에 브라우저 요청 ID가 빠져 있는 코드 확인 · #587 |
| 2026-11-15-auth-admin-email-monitoring-F01-E02 | 2026-11-15-auth-admin-email-monitoring-F01 | FIXED | 2026-11-15T19:38:44+09:00 | 네트워크·502 보고와 4xx·취소 제외 테스트 통과 · #587 |
| 2026-11-15-auth-admin-email-monitoring-F02-E02 | 2026-11-15-auth-admin-email-monitoring-F02 | FIXED | 2026-11-15T19:38:44+09:00 | 재전송 헤더와 모니터링의 요청 ID 일치 테스트 통과 · #587 |

- 필수 PASS 4, FAIL 0, UNVERIFIED 0, N/A 0. 운영 미확인 1.
- 신규 발견 2, 해결 2, 미해결 0. P0 0, P1 0, P2 0, P3 2. 오탐 0.
- 발견 경로 PRECHECK 0, INDEPENDENT_REVIEW 0, POST_FIX_CHECK 0, EXTERNAL 2.
