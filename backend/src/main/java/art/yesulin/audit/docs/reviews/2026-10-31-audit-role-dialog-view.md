# PDF 심사 배역 설정 창 표시 수정

- 작업 ID: `2026-10-31-audit-role-dialog-view`
- 평가일: 2026-10-31. 기준 HEAD: `31e5df55`와 이번 UI 변경.
- 요청: 배역 설정 창 뒤로 표와 SNS 링크가 비치는 첨부 화면 수정.
- 범위: ScreeningBoard의 배역 설정 모달 표현과 해당 전용 CSS. 일정 관리·합격자 연락처 기능은 이번 요청의 구현 범위가 아니다.
- 원인: 모달/선택란이 정의되지 않은 `--card`, `--border`, `--muted-strong` 변수를 사용했다. 특히 배경이 유효한 색으로 계산되지 않아 포털 모달 뒤의 표와 스크림이 비쳤다. 공통 레이어 자체는 scrim 50/panel 60으로 정상이다.
- 변경: `bg-card` 등 공통 토큰, FieldSelect/PrimaryButton/SecondaryButton 적용. 제목·설명·선택란·하단 버튼 간격 정리, 오류 메시지 분리, 저장 중 선택란 비활성화. 사용하지 않게 된 roleModal/modalActions 규칙과 CSS import 삭제.

## 평가표 v1

공통·Audit 평가 규칙과 도메인 흐름/정책, 프론트 디자인 시스템을 적용했다. UI 표시 변경이므로 API/분석 이벤트 의미 및 성공 지점은 변경하지 않았다.

| ID | 필수 | 흐름·실패 조건 / 기대 결과 | 검증 방법·결과 |
| --- | --- | --- | --- |
| R01 | 예 | 모달 뒤의 표가 비치지 않고 스크림 위에 표시 | PASS — 실제 브라우저에서 모달 배경 rgb(255,255,255), zIndex 60. 데스크톱 스크린샷 확인 |
| R02 | 예 | 좁은 화면에서도 필드·버튼 잘림과 모달 가로 넘침 없음 | PASS — 기본 데스크톱과 viewport 390×844에서 시각 확인. 양쪽 모두 scrollWidth > clientWidth false, max-height/overflow-y 유지 |
| R03 | 예 | 배역 선택·저장·취소·Escape·필드 이름/설명 유지 | PASS — 실제 ScreeningBoard 합성 자료에서 주연 선택→저장→2행 반영. 조연 선택→취소 시 주연 유지. Escape 시 닫힘 및 배역 설정 버튼으로 포커스 복귀. label/aria-describedby/disabled 정적 확인 |
| R04 | 예 | 배역 API와 수동 메모·판정 보존 규칙 유지 | PASS(정적/회귀) — assign 및 API 호출·onSaved 로직 diff 없음. 관련 기존 테스트 통과. 브라우저 저장은 모의 API이며 실제 서버 권한·DB 저장 시험을 대신하지 않음 |
| R05 | 예 | 미사용 코드·스타일·임시 확인 경로 정리 | PASS — roleModal/modalActions 참조 0, 미사용 CSS import 제거. 임시 dev/role-dialog-check/page.tsx 삭제 확인. 새 의존성/환경 설정 없음 |

필수 PASS 5 / FAIL 0 / UNVERIFIED 0 / N/A 0. 검증률 5/5=100%는 이번 UI 수정 범위 확인 비율이며 전체 PDF 기능·배포 상태의 완료율이 아니다.

## 검증 근거

- `frontend`: `npm run lint` → exit 0.
- `frontend`: `npm test -- src/features/pdf-reviews src/components/pdf-reviews` → 6개 파일, 31개 테스트 통과.
- `git diff --check` → 통과.
- 로컬 Next 개발 서버의 임시 합성 화면에서 실제 ScreeningBoard/ModalShell을 렌더링했다. PDF 조회와 배역 PATCH는 합성 응답으로 대체했으며 실제 지원자나 운영 데이터는 사용하지 않았다. 검증 뒤 임시 페이지를 삭제하고 viewport override를 해제했다.
- 로컬 스크린샷: `/private/tmp/yesulin-role-dialog-desktop.png`, `/private/tmp/yesulin-role-dialog-mobile.png`. 임시 증거 경로이며 저장소에 이미지·개인정보를 추가하지 않았다.
- 순수 UI 변경으로 실제 API 계약·라우팅·타입 정의는 변경하지 않았다. 운영 배포·실제 API 저장 재검증·300건 시험은 이번 검증 범위가 아니다.

## 문제·독립 평가

| 문제 ID | 심각도/유형/유입 | 발견 경로 | 상태 | 근거·조치·수정 후 확인 |
| --- | --- | --- | --- | --- | --- |
| 2026-10-31-audit-role-dialog-view-F01 | P2/CODE/EXISTING | EXTERNAL | FIXED | 사용자 첨부의 배역 설정 배경 비침. screening.module.css의 정의되지 않은 배경 변수를 공통 토큰/컨트롤로 교체. 브라우저 흰 배경·레이어·선택/저장/취소 확인, lint/31개 테스트 통과 |

신규 기록 발견 1 / 해결 1 / 미해결 0 / P0 0 / P1 0 / P2 1 / P3 0.
PRECHECK 0 / INDEPENDENT_REVIEW 0 / POST_FIX_CHECK 0 / EXTERNAL 1. 오탐 0 / 평가표 미확인 0.
최초 기록 PR: PENDING. PR은 생성하거나 게시하지 않았다.

| 사건 | 문제 ID | 종류 | 시각(+09:00) | 근거·관련 PR |
| --- | --- | --- | --- | --- |
| E01 | 2026-10-31-audit-role-dialog-view-F01 | CONFIRMED | 2026-10-31T13:25:35+09:00 | 첨부 화면과 현재 CSS/전역 토큰 대조, 원인 확인 / PENDING |
| E02 | 2026-10-31-audit-role-dialog-view-F01 | FIXED | 2026-10-31T13:28:14+09:00 | 공통 토큰 적용·시각/조작 검증 및 lint/기존 테스트 통과 / PENDING |

별도 실행 가능한 평가 도구/CLI가 없어 공통 규칙의 대체 절차에 따라 같은 종류의 별도 에이전트로 독립 읽기 전용 평가 1회를 수행했다. 데스크톱 앱의 존재만으로 저장소 diff를 검토할 실행 도구가 제공된 것으로 취급하지 않았다. 평가자 재귀 평가 없음.
평가자는 공통 토큰의 정의, 취소 버튼 type=button, 필드 접근성, 저장 로직 불변, 삭제한 스타일의 참조 부재를 확인했다. 신규 문제는 발견하지 않았다. 작성자의 좁은 화면/Escape/취소 QA와 임시 경로 삭제 근거를 함께 전달했다.

기존 `2026-10-31-audit-pdf-flow-check-F01`(301명 이상 일괄 배역 지정)은 이번 표시 수정 범위 밖이며 해결했다고 주장하지 않는다. 기존 평가 기록·사용자 미추적 가이드·output/tmp 자료는 보존했다.
