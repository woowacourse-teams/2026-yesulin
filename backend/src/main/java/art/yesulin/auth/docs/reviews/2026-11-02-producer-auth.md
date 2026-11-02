# 2026-11-02 가입과 세션 복구 평가

- 작업 ID: `2026-11-02-auth-producer-auth`
- 평가일: 2026-11-02 (Asia/Seoul), 평가표 v1
- 독립 평가: 1회 완료. 선호 평가 도구의 인증을 사용할 수 없어 별도 평가자로 대체했다.
- 필수: PASS 8 / FAIL 0 / UNVERIFIED 1. N/A 1은 편집 보호가 범위 밖이므로 제외한다.
- 신규 확정: 발견 3 / 해결 3 / 미해결 0. P0 0 / P1 2 / P2 1 / P3 0.
- 발견 경로: PRECHECK 2 / INDEPENDENT_REVIEW 1 / POST_FIX_CHECK 0 / EXTERNAL 0. 오탐 0.

| ID | 흐름과 실패 조건 | 기대 결과와 검증 근거 | 필수 | 결과 |
| --- | --- | --- | --- | --- |
| A01 | 초기 SMTP 실패 | 로컬 SMTP 451에도 가입 HTTP 201, PENDING 로그인 유지. `smtpFailureKeepsSuccessfulSignupAndAllowsLoginAndResend` | Y | PASS |
| A02 | 다른 세션에서 활성화 | 별도 두 CookieJar로 미인증 로그인 후 한쪽 인증, 다른 세션 GET에서 재로그인 없이 ACTIVE 확인 | Y | PASS |
| A03 | 탭 복귀 | `auth-session.test.tsx`의 focus ACTIVE 갱신 검증 | Y | PASS |
| A04 | 로그인 경로 이동 | 실제 브라우저 로그인 후 새 문서로 인증 대기 화면 진입 확인 | Y | PASS |
| A05 | 늦은 응답 | 최초 조회 지연/실패와 로그아웃 경합 단위 테스트 통과 | Y | PASS |
| A06 | 권한과 삭제 | 삭제 회원 조회 거절, 비로그인 실제 HTTP 401, PENDING 제한 확인 | Y | PASS |
| A07 | 재전송 실패 | application 통합 테스트에서 SMTP 오류 전파와 PENDING 유지 확인 | Y | PASS |
| A08 | 운영 미수신 | AWS CLI 세션 만료. 실제 운영 SMTP 오류와 수신함 전달 원인 미확인 | Y | UNVERIFIED |
| A09 | 정리 | 새 코드 소비자와 문서 링크를 독립 평가로 확인 | Y | PASS |
| A10 | 지원서 편집 보호 | 지원서 저장/편집은 변경 범위 밖 | N | N/A |

## 문제 목록

| 문제 ID | 심각도/유형/유입 | 발견 경로 | 근거와 조치 | 상태 | 최초 확정/해결 | 최초 PR |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-11-02-auth-producer-auth-F01 | P1/FLOW/EXISTING | PRECHECK | current가 저장된 principal만 반환해 외부 인증 후 PENDING 유지. `AuthService.findCurrent`로 DB 상태를 읽고 세션 갱신 | FIXED | 2026-11-02 UNKNOWN / 2026-11-02 UNKNOWN | PENDING |
| 2026-11-02-auth-producer-auth-F02 | P1/FLOW/EXISTING | PRECHECK | AFTER_COMMIT SMTP 예외가 이미 완료된 가입 응답을 실패시킴. 초기 발송 실패만 격리하고 안전한 오류 신호 기록 | FIXED | 2026-11-02 UNKNOWN / 2026-11-02 UNKNOWN | PENDING |
| 2026-11-02-auth-producer-auth-F03 | P2/CODE/INTRODUCED | INDEPENDENT_REVIEW | 과거 조회 실패가 최신 조회보다 먼저 sessionReady를 확정. `SessionSynchronizer`로 성공/실패 모두 revision 검사 | FIXED | 2026-11-02 UNKNOWN / 2026-11-02 UNKNOWN | PENDING |

## 검증 환경

격리 H2, 기존 local/test 프로필과 테스트 저장소, localhost SMTP, 브라우저 127.0.0.1:3207. 외부 메일/운영 데이터는 사용하지 않았다.
최종 명령과 추가 범위는 [6자리 평가](2026-11-02-verification-code.md)를 따른다.

## 시각 기록의 한계

최초 발견과 코드 수정 당시의 정확한 시각을 따로 저장하지 않았다. 최초 확정/해결일은 2026-11-02이며 시각은 `UNKNOWN`으로 남긴다. 아래 사건의 시각은 감사 기록을 추가한 시각(`2026-11-02T13:42:52+09:00`)이며 최초 발견 시각으로 집계하지 않는다. 최초 기록 PR은 생성 후 갱신한다.

## 추가 전용 상태 사건 이력

| 사건 ID | 문제 ID | 사건 | 기록 시각(+09:00) | 근거/PR |
| --- | --- | --- | --- | --- |
| 2026-11-02-auth-producer-auth-F01-E01 | 2026-11-02-auth-producer-auth-F01 | CONFIRMED | 2026-11-02T13:42:52+09:00 | 위 근거 확인 기록, 최초 확정 시각 UNKNOWN / PR PENDING |
| 2026-11-02-auth-producer-auth-F01-E02 | 2026-11-02-auth-producer-auth-F01 | FIXED | 2026-11-02T13:42:52+09:00 | 위 수정 후 검증 기록, 실제 수정 시각 UNKNOWN / PR PENDING |
| 2026-11-02-auth-producer-auth-F02-E01 | 2026-11-02-auth-producer-auth-F02 | CONFIRMED | 2026-11-02T13:42:52+09:00 | 위 근거 확인 기록, 최초 확정 시각 UNKNOWN / PR PENDING |
| 2026-11-02-auth-producer-auth-F02-E02 | 2026-11-02-auth-producer-auth-F02 | FIXED | 2026-11-02T13:42:52+09:00 | 위 수정 후 검증 기록, 실제 수정 시각 UNKNOWN / PR PENDING |
| 2026-11-02-auth-producer-auth-F03-E01 | 2026-11-02-auth-producer-auth-F03 | CONFIRMED | 2026-11-02T13:42:52+09:00 | 위 근거 확인 기록, 최초 확정 시각 UNKNOWN / PR PENDING |
| 2026-11-02-auth-producer-auth-F03-E02 | 2026-11-02-auth-producer-auth-F03 | FIXED | 2026-11-02T13:42:52+09:00 | 위 수정 후 검증 기록, 실제 수정 시각 UNKNOWN / PR PENDING |
