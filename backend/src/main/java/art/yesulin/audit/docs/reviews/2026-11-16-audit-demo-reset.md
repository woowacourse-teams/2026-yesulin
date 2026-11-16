# 시연 계정 심사함 초기화 (로컬·dev 전용)

작업 ID `2026-11-16-audit-demo-reset`, Audit v1. 전시회 시연 계정을 방문자마다 처음 상태로 되돌리는 `DELETE /api/v1/pdf-reviews`.

| ID | 흐름·실패 조건·기대 결과 | 검증 | 필수 | 결과 |
| --- | --- | --- | --- | --- |
| S01 | 호출한 공연사의 심사함·배역·지원서·PDF 작업·payload·AI 작업과 S3 원본을 모두 지움. 배역 배정된 지원서와 빈 심사함 포함 | DB 테스트 | Y | PASS |
| S02 | 다른 공연사의 심사함·작업은 그대로 | DB 테스트 | Y | PASS |
| S03 | 업로드 중·결과 대기 지원서가 있으면 409, 아무것도 지우지 않음 | DB 테스트 | Y | PASS |
| S04 | S3 삭제 실패 시 DB 롤백, 다시 호출하면 이어서 지움 | DB 테스트 | Y | PASS |
| S05 | `local`·`dev` 프로필 + 설정 true에서만 등록. `prod`는 설정을 강제로 켜도 미등록 | 조건 테스트 | Y | PASS |
| S06 | 심사함 행을 잠가 같은 심사함의 업로드 접수와 겹치지 않음 | 코드 검토 | Y | PASS |
| S07 | dev 실제 요청으로 삭제와 S3 정리 확인 | dev 배포 후 실행 | Y | UNVERIFIED |
| S08 | 계약·도메인·흐름 문서, 미사용 정리, Checkstyle, 독립 평가 1회 | 실행·평가 | Y | PASS |

## 검증 근거 (2026-11-16)

- 첫 커밋 기준 백엔드 전체 테스트 1555건 중 1554건 PASS. 실패 1건 `OtrSubmissionPhotoAccessMysqlTest`는 실행 PC의 PATH에 섞인 따옴표 때문에 실행 조건 평가가 실패한 환경 문제로, 이 변경과 무관하다.
- 평가 지적 수정 후 Checkstyle(main·test) PASS, `art.yesulin.audit.*`·`art.yesulin.pdfextraction.*` 222건 PASS. 수정 후 전체 테스트는 다시 돌리지 않았다.
- H2(MySQL 모드) DB 테스트 5건: 전체 삭제, 빈 심사함, 다른 공연사 보존, 처리 중 409, S3 실패 롤백·재시도. 조건 테스트 3건: dev·local 등록, prod 미등록(설정 강제), 설정 없음 미등록.
- 운영 MySQL·AWS·dev 서버는 바꾸지 않았다. dev 실제 요청은 배포 뒤 확인한다.
- 독립 평가 1회: 상대 도구를 연결할 수 없어 같은 종류의 별도 에이전트가 읽기 전용으로 검토했다. 지적 7건을 모두 고친 뒤 관련 테스트만 다시 실행했다.

## 미사용·호환 정리

새 저장소 메서드 3개(`findByReviewId`, 두 `deleteByReviewId`)와 오류 코드 `PDF_REVIEW_RESET_BUSY`는 모두 초기화 서비스가 쓴다. 프론트 화면은 이 경로를 부르지 않아 타입·MSW·분석 문서는 바꾸지 않았다(외부 스크립트·Postman 전용). 일정표의 `source_review_id`는 FK가 없고 원본이 없어도 일정표가 열린다.

## 평가 결과

필수 PASS7 / FAIL0 / UNVERIFIED1 / N/A0. MySQL에서 초기화와 AI 작업 완료가 동시에 실행될 때의 잠금 순서는 실행하지 않았다(처리 중 업로드·콜백은 409로 막지만 AI 작업은 막지 않는다).

발견7 = 해결7 + 미해결0. P0 0 / P1 0 / P2 1 / P3 6.
PRECHECK0 / INDEPENDENT_REVIEW7 / POST_FIX_CHECK0 / EXTERNAL0 / REJECTED0. 최초 PR은 모두 PENDING.

| 문제 ID | 심각도/유형/유입/경로 | 근거·조치·검증 | 상태 |
| --- | --- | --- | --- |
| 2026-11-16-audit-demo-reset-F01 | P2/DOC/INTRODUCED/INDEPENDENT_REVIEW | "환경 변수로 바꿀 수 없다"는 문서가 틀림(느슨한 바인딩·실행 인자). 서비스·컨트롤러에 `@Profile({"local","dev"})` 추가, 문서 수정. prod 강제 설정 미등록 조건 테스트 PASS | FIXED |
| 2026-11-16-audit-demo-reset-F02 | P3/FLOW/INTRODUCED/INDEPENDENT_REVIEW | 처리 중 작업을 지우면 늦은 Lambda 결과가 S3에 남고 콜백이 반복 실패. 처리 중이면 409로 거부, 문서화. DB 테스트 PASS | FIXED |
| 2026-11-16-audit-demo-reset-F03 | P3/FLOW/INTRODUCED/INDEPENDENT_REVIEW | 심사 행을 잠그지 않아 동시 업로드 시 고아 작업 가능. `findOwnedForUpdate`로 먼저 잠근 뒤 작업 조회 | FIXED |
| 2026-11-16-audit-demo-reset-F04 | P3/DOC/INTRODUCED/INDEPENDENT_REVIEW | S3 실패 시 앞서 지운 원본 보기가 실패할 수 있음을 문서에 추가 | FIXED |
| 2026-11-16-audit-demo-reset-F05 | P3/CODE/INTRODUCED/INDEPENDENT_REVIEW | 일반 컴포넌트에 `@ConditionalOnBean` 사용. 서비스와 같은 조건식·프로필을 컨트롤러에 직접 걸도록 변경 | FIXED |
| 2026-11-16-audit-demo-reset-F06 | P3/TEST/INTRODUCED/INDEPENDENT_REVIEW | 배역 배정·빈 심사함·등록 조건 테스트 누락. DB 테스트 2건·조건 테스트 3건 추가 PASS | FIXED |
| 2026-11-16-audit-demo-reset-F07 | P3/DOC/INTRODUCED/INDEPENDENT_REVIEW | 흐름 문서가 삭제 없음으로 남고 정책 설명이 "남은 일"에 있음. 흐름에 예외 한 줄, 정책을 별도 절로 이동 | FIXED |

## 추가 전용 상태 이력

확인 시각은 추정하지 않고 수정·표적 검증을 정리한 시각을 쓴다. PR PENDING.

| 사건 | 문제 ID | 종류 | 시각(+09:00) | 근거 / 최초 PR |
| --- | --- | --- | --- | --- |
| E01 | 2026-11-16-audit-demo-reset-F01 | CONFIRMED | 2026-11-16T16:53:04+09:00 | 독립 평가 / PENDING |
| E02 | 2026-11-16-audit-demo-reset-F01 | FIXED | 2026-11-16T16:53:04+09:00 | 위 수정·표적 검증 / PENDING |
| E03 | 2026-11-16-audit-demo-reset-F02 | CONFIRMED | 2026-11-16T16:53:04+09:00 | 독립 평가 / PENDING |
| E04 | 2026-11-16-audit-demo-reset-F02 | FIXED | 2026-11-16T16:53:04+09:00 | 위 수정·표적 검증 / PENDING |
| E05 | 2026-11-16-audit-demo-reset-F03 | CONFIRMED | 2026-11-16T16:53:04+09:00 | 독립 평가 / PENDING |
| E06 | 2026-11-16-audit-demo-reset-F03 | FIXED | 2026-11-16T16:53:04+09:00 | 위 수정 / PENDING |
| E07 | 2026-11-16-audit-demo-reset-F04 | CONFIRMED | 2026-11-16T16:53:04+09:00 | 독립 평가 / PENDING |
| E08 | 2026-11-16-audit-demo-reset-F04 | FIXED | 2026-11-16T16:53:04+09:00 | 문서 수정 / PENDING |
| E09 | 2026-11-16-audit-demo-reset-F05 | CONFIRMED | 2026-11-16T16:53:04+09:00 | 독립 평가 / PENDING |
| E10 | 2026-11-16-audit-demo-reset-F05 | FIXED | 2026-11-16T16:53:04+09:00 | 위 수정·조건 테스트 / PENDING |
| E11 | 2026-11-16-audit-demo-reset-F06 | CONFIRMED | 2026-11-16T16:53:04+09:00 | 독립 평가 / PENDING |
| E12 | 2026-11-16-audit-demo-reset-F06 | FIXED | 2026-11-16T16:53:04+09:00 | 테스트 추가 / PENDING |
| E13 | 2026-11-16-audit-demo-reset-F07 | CONFIRMED | 2026-11-16T16:53:04+09:00 | 독립 평가 / PENDING |
| E14 | 2026-11-16-audit-demo-reset-F07 | FIXED | 2026-11-16T16:53:04+09:00 | 문서 수정 / PENDING |
