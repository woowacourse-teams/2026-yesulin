# 기획사 인증 메일 SMTP 상세 상태 코드 평가

- 작업 ID `2026-11-15-auth-producer-smtp-enhanced-status`
- 평가일 2026-11-15, 인증 평가표 v1
- 독립 평가 1회. Claude CLI가 없어 별도 읽기 전용 평가자를 사용했다.

| ID | 시나리오 | 기대 결과와 검증 근거 | 필수 | 판정 |
| --- | --- | --- | --- | --- |
| A01 | SMTP 거절 응답의 상세 코드 | Angus의 수신자·발신자·명령 거절 예외에서 응답 선두의 SMTP 코드와 상세 코드 클래스가 일치하는 값만 선택. 공백·하이픈 구분의 550과 451 확인. `VerificationMailSenderTest` | Y | PASS |
| A02 | 코드 부재·기본 코드 불일치·주소와 인증번호 혼입 | 상세 필드를 생략하고 타입이 제공한 기본 코드는 유지. 로그와 Slack 인수에 주소, 인증번호, 원인 예외 원문과 스택을 포함하지 않음. `VerificationMailSenderTest` | Y | PASS |
| A03 | 관리자 요약과 Slack | 관리자 로그 요약에서 5.1.1과 5.7.1을 구분. 미등록·구버전·유효하지 않은 상세 필드는 분류 또는 기존 요약 유지. Slack에 확인한 코드 표시. `log-view.test.ts`, `VerificationMailSenderTest` | Y | PASS |
| A04 | 가입·재전송 및 기존 세션과 로그 API | `ProducerAuthRecoveryTest`, `ProducerControllerTest`, `SessionControllerTest`, `auth-session.test.tsx` 통과. 로그 API는 상세 코드를 선택 속성으로 전달 | Y | PASS |
| A05 | 변경 범위와 미사용 여부 | 새 필드·파서·요약 함수 사용처, 문서 경로, 의존성 변경 없음과 `git diff --check` 확인 | Y | PASS |
| A06 | 운영 서버의 실제 거절·Slack·관리자 브라우저 | 실서비스 배포와 공급자 거절 재현, 웹훅 도착과 운영 관리자 화면 확인 | N | UNVERIFIED |

백엔드 표적 테스트 72개와 Checkstyle main/test, 프론트 표적 테스트 30개와 ESLint 및 Webpack 프로덕션 빌드를 통과했다.
독립 평가에서 Angus 2.0.5가 SMTP 거절 예외에 응답 원문을 주는 경로와, 관리자 로그 파서에서 추가 속성이 목록에 연결되는 경로를 확인했다.
상세 코드는 [SMTP 상세 상태 확장](https://www.rfc-editor.org/rfc/rfc2034.html), 관리자 설명은
[Gmail SMTP 응답 코드](https://support.google.com/mail/answer/3726730?hl=en)를 참조했다.

- 필수 PASS 5, FAIL 0, UNVERIFIED 0. 운영 미확인 1. 필수 검증률 5/5.
- 신규 발견 0, 해결 0, 미해결 0. P0 0, P1 0, P2 0, P3 0. 오탐 0.
- 발견 경로 PRECHECK 0, INDEPENDENT_REVIEW 0, POST_FIX_CHECK 0, EXTERNAL 0.
