# 기획사 인증 메일 미수신 코드 분석

- 작업 ID `2026-11-15-auth-producer-verification-non-delivery`
- 평가일 2026-11-15, 인증 평가표 v1, 기준 커밋 `67107677`
- 범위는 가입과 인증 메일 발급·전송·재전송이다. 제품 코드와 운영 설정을 수정하지 않았다.
- 독립 평가 1회. Claude CLI가 확인되지 않아 별도 읽기 전용 평가자를 사용했다.

| ID | 흐름·실패 조건 | 기대 결과 | 검증 근거 | 필수 | 판정 |
| --- | --- | --- | --- | --- | --- |
| A01 | 회원 저장 후 초기 메일 처리 실패 | 가입 성공과 PENDING 상태 유지, 실패 로그 기록 | `ProducerSignUpEventHandler`의 AFTER_COMMIT, `EmailVerificationService.sendInitialVerification`의 예외 처리, `ProducerAuthRecoveryTest.smtpFailureKeepsSuccessfulSignupAndAllowsLoginAndResend` 소스 | Y | PASS |
| A02 | 미인증 회원 재요청, 60초 내 중복, 저장 후 SMTP 실패 | 60초 내 409, SMTP 예외 전파, SMTP 호출 반환 후 204 | `EmailVerificationController.resend`, `JpaEmailVerificationRepository.save`, `EmailVerificationService.issueVerification`, `ProducerAuthRecoveryTest.enforcesResendDelayAndInvalidatesPreviousCode` 소스 | Y | PASS |
| A03 | SMTP 호출이 성공한 뒤 수신함에 보이지 않음 | SMTP 제출 결과와 사서함 도착 여부를 구분 | `GoogleSmtpMailSender.send`의 SMTP 호출과 [인증 흐름](../flows/producer-auth.md) | Y | PASS |
| A04 | 제보 건의 실제 실패 단계 식별 | 해당 요청에서 발송 실패 또는 이후 전달 문제를 확인 | 코드 분석 요청으로 운영 로그·수신 상태 확인 범위 제외 | Y | UNVERIFIED |
| A05 | 미사용 파일·코드·설정·의존성·옛 문서 혼입 | 작업 관련 변경만 포함 | 제품 diff 없이 이 평가 기록만 추가 | N | N/A |

기존 복구 테스트의 메일 전송기는 모의 객체다. 이 기록은 정적 분석에 근거하며 테스트 재실행과 실제 SMTP 연결은 수행하지 않았다.
가입·재전송 범위 밖의 다중 탭과 로그아웃 경쟁은 인증 메일 전송 원인 분석에서 제외했다.

## 문제와 집계

| 문제 ID | 심각도·유형·유입 | 발견 경로 | 상태 | 근거와 조치 | 최초 확정 | 최초 PR | 해결 시각 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-11-15-auth-producer-verification-non-delivery-F01 | P2 · POLICY · EXISTING | INDEPENDENT_REVIEW | OPEN | [인증 작업 규칙](../AGENTS.md)은 SMTP 예외 메시지 기록을 금지한다. 재전송 예외는 [공통 요청 필터](../../../global/web/RequestLoggingFilter.java)에서 cause를 포함한 구조화 로그로 전달될 수 있다. 원문이 운영 로그에 실제로 남았는지는 확인하지 않았다. 코드 분석 범위에서 수정과 재검증은 수행하지 않았다. | 2026-11-15T15:04:34+09:00 | #587 | — |

| 사건 ID | 문제 ID | 사건 | 발생 시각 | 근거·PR |
| --- | --- | --- | --- | --- |
| 2026-11-15-auth-producer-verification-non-delivery-F01-E01 | 2026-11-15-auth-producer-verification-non-delivery-F01 | CONFIRMED | 2026-11-15T15:04:34+09:00 | 재전송 예외 전파와 공통 요청 필터의 cause 기록 경로를 소스로 확인함 · #587 |
| 2026-11-15-auth-producer-verification-non-delivery-F01-E02 | 2026-11-15-auth-producer-verification-non-delivery-F01 | FIXED | 2026-11-15T15:23:05+09:00 | SMTP 예외를 안전한 502로 변환하고 재전송의 원인 예외 미전파 테스트 통과 · [후속 작업](2026-11-15-producer-verification-mail-recovery.md) · #587 |

최초 평가 시점 집계

- 필수 PASS 3, FAIL 0, UNVERIFIED 1. N/A 1. 필수 검증률 3/4.
- 신규 발견 1, 해결 0, 미해결 1. P0 0, P1 0, P2 1, P3 0. 오탐 0.
- 발견 경로 PRECHECK 0, INDEPENDENT_REVIEW 1, POST_FIX_CHECK 0, EXTERNAL 0.
