# 2026-11-19-pdf-review-sidebar-roles

PDF 지원자 심사 화면 상단을 정리하는 작업.
PC에서 사이드 메뉴가 열려 있으면 공연사 상단바를 숨기고, 심사함 제목과 배역 필터를 사이드 메뉴의 `PDF 지원서 심사` 아래로 옮긴다.
본문 위는 판정 탭, 폴더 선택과 PDF 추가, 보기 전환, 이전/다음을 한 줄로 모은다. 판정 뒤 되돌리기 알림을 없애고 Z 단축키만 남긴다.

- 도메인·평가표: frontend 평가 규칙, Audit 문서 입구, 이 작업 평가표 v1(판정 API와 이벤트 계약은 그대로, 되돌리기 입력 방식만 단축키로 줄어듦)
- 평가: 독립 평가 1회(읽기 전용). 우선 평가 도구가 계정에서 설정 모델을 지원하지 않아 같은 종류의 별도 에이전트로 대체했다.

## 평가표

| ID | 흐름 | 기대 결과 | 필수 | 독립 평가 | 수정 후 |
| --- | --- | --- | --- | --- | --- |
| R01 | 상단바 숨김 | 사이드 메뉴가 열린 PC에서만 숨김, 닫힘과 집중 모드에서는 열기 버튼과 함께 유지 | Y | PASS(테스트 없음) | PASS, 셸 테스트는 F08로 남김 |
| R02 | 배역 사이드 이동·목록 복귀 | 메뉴에 제목과 배역, 모바일·메뉴 닫힘·셸 없는 화면은 본문 유지, 메뉴 링크로 저장 확인을 거쳐 목록 복귀 | Y | FAIL(F01) | PASS: 같은 주소 링크는 기본 동작만 막아 메뉴 닫기 처리가 그대로 실행 |
| R03 | 한 줄 툴바·이전/다음 | 판정 탭, 업로드, 보기 전환, 이전/다음 한 줄, 카드·표 상세의 목록 버튼은 본문 유지 | Y | PASS(F04 경미) | PASS |
| R04 | 되돌리기 알림 제거·Z 유지 | 알림·버튼 없음, Z로 직전 판정 복원, 빈 목록 Z, 숨은 지원서를 되돌리지 않음 | Y | FAIL(F02) | PASS: 배역·판정 탭·보기 전환과 목록 복귀 때 직전 판정을 비움 |
| R05 | 분석 | `decision_undo` 계약 유지, 입력 방식 변화 시점 기록, 대시보드 ③ 제외 유지 | Y | PASS(F07) | PASS |
| R06 | 미사용·문서 | 되돌리기 알림·업로드 툴바 잔재 제거, design-system·pdf-reviews·architecture·analytics 일치 | Y | PASS(F06 경미) | PASS |
| R07 | 코드 규칙·테스트 | 새 코드에 삼항·else 없음, 새 동작 테스트 | Y | FAIL(F05, F08) | PASS: 삼항을 함수로 바꿈, 메뉴 닫기 테스트 추가. F08 일부 미해결 |
| R08 | 실제 화면 | dev 실제 심사함에서 확인 | N | UNVERIFIED | UNVERIFIED |

필수 결과(수정 후): PASS 7 / FAIL 0 / UNVERIFIED 0 / N/A 0. R08은 선택 미확인.

## 문제

| 문제 ID | 심각도 | 유형 | 유입 | 발견 경로 | 최초 확정 | 해결 | 최초 PR | 상태 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-11-19-pdf-review-sidebar-roles-F01 | P2 | FLOW | INTRODUCED | INDEPENDENT_REVIEW | 2026-11-19T14:36:00+09:00 | 2026-11-19T14:42:51+09:00 | - | FIXED |
| 2026-11-19-pdf-review-sidebar-roles-F02 | P2 | FLOW | INTRODUCED | INDEPENDENT_REVIEW | 2026-11-19T14:36:00+09:00 | 2026-11-19T14:42:51+09:00 | - | FIXED |
| 2026-11-19-pdf-review-sidebar-roles-F03 | P3 | A11Y | INTRODUCED | INDEPENDENT_REVIEW | 2026-11-19T14:36:00+09:00 | 2026-11-19T14:42:51+09:00 | - | FIXED |
| 2026-11-19-pdf-review-sidebar-roles-F04 | P3 | FLOW | INTRODUCED | INDEPENDENT_REVIEW | 2026-11-19T14:36:00+09:00 | - | - | OPEN |
| 2026-11-19-pdf-review-sidebar-roles-F05 | P3 | CODE | INTRODUCED | INDEPENDENT_REVIEW | 2026-11-19T14:36:00+09:00 | 2026-11-19T14:42:51+09:00 | - | FIXED |
| 2026-11-19-pdf-review-sidebar-roles-F06 | P3 | UNUSED | INTRODUCED | INDEPENDENT_REVIEW | 2026-11-19T14:36:00+09:00 | - | - | OPEN |
| 2026-11-19-pdf-review-sidebar-roles-F07 | P3 | DOC | INTRODUCED | INDEPENDENT_REVIEW | 2026-11-19T14:36:00+09:00 | 2026-11-19T14:42:51+09:00 | - | FIXED |
| 2026-11-19-pdf-review-sidebar-roles-F08 | P3 | TEST | INTRODUCED | INDEPENDENT_REVIEW | 2026-11-19T14:36:00+09:00 | - | - | OPEN |

- F01: 같은 주소 메뉴 링크에서 이벤트 전파까지 막아 모바일 메뉴·집중 모드 메뉴가 목록 위에 열린 채 남을 수 있었다. → 기본 이동만 막고 링크의 메뉴 닫기 처리는 그대로 둔다. 테스트 추가.
- F02: 알림을 없앤 뒤 직전 판정이 탭·배역·보기 전환과 목록 복귀 뒤에도 남아, 다른 탭에서 Z를 누르면 보이지 않는 지원서가 조용히 되돌려질 수 있었다. → 전환·복귀 때 직전 판정을 비운다. 로컬 화면에서 판정 후 보류 탭으로 옮겨 Z를 눌러도 저장되지 않음을 확인.
- F03: 메뉴의 심사함 제목에 `aria-current`가 겹쳤고, 연락처 화면에서 빈 배역 nav가 남았다. → 제목의 `aria-current`를 빼고 배역이 없으면 nav를 그리지 않는다.
- F04: 이전/다음 자리가 첫 커밋에서 비어 있어 한 번 본문에 그렸다가 툴바로 옮긴다. ref 콜백의 상태 변경은 화면을 그리기 전 동기 처리라 깜빡임은 보이지 않았고, 진입 직후에는 버튼에 초점이 없어 이번에는 남긴다.
- F05: 새 코드에 삼항 4곳. → `managedBySidebar`, `singlePagerSlot`, `placePager`로 바꿨다.
- F06: `EmptyListUndo`가 이제 Z 처리와 실패 문구만 맡는데 이름이 그대로다. 동작에는 영향이 없어 이름 정리는 남긴다.
- F07: 되돌리기 입력 방식이 버튼에서 단축키로만 바뀌는 시점이 문서에 모호했다. → 브랜치와 PR에 dev 배포 시각을 남기고 그 전 `button` 입력과 섞어 보지 않도록 적었다.
- F08: 셸 상단바 표시 조건, 메모 저장 대기 중 메뉴 링크, 셸 없는 화면의 본문 배역, 빈 목록 Z, 카드·표 목록 버튼 위치 테스트가 없다. 메뉴 닫기는 추가했고 나머지는 로컬 화면 확인으로 대신해 남긴다.

집계: 발견 8 = 해결 5 + 미해결 3, P0 0 / P1 0 / P2 2 / P3 6. INDEPENDENT_REVIEW 8, POST_FIX_CHECK 0, PRECHECK 0. 오탐 0. 미확인 1(R08, 선택).

## 사건 이력

| 사건 ID | 문제 ID | 종류 | 시각 | 근거 |
| --- | --- | --- | --- | --- |
| E01~E08 | F01~F08 | CONFIRMED | 2026-11-19T14:36:00+09:00 | 독립 평가 |
| E09 | F01, F02, F03, F05, F07 | FIXED | 2026-11-19T14:42:51+09:00 | 관련 vitest 29파일 191테스트, eslint, tsc, build 통과 |

## 검증 근거

- 로컬(목 로그인, 심사 API는 브라우저 안에서만 가짜 응답) 1440×900: 상단바 없음, 메뉴에 제목과 배역 6개, 본문 한 줄 툴바, 메뉴 배역 선택 시 탭 수 갱신, D 판정 후 알림 없음, Z 복원(빈 목록 포함), 메뉴 링크로 목록 복귀, 390px 폭은 경로와 배역 칩을 본문에 유지. 원본 PDF는 로컬 백엔드가 없어 보이지 않았다.
- `npx vitest run src/components/pdf-reviews src/features/pdf-reviews src/components/producers`: 29파일 191테스트 통과(수정 후)
- 전체 `npx vitest run`: 이번 변경과 무관한 `actor-screen-view.test.tsx` 6건이 로컬 테스트 환경 오류로 실패(변경 전과 같음)
- `npx eslint`, `npx tsc --noEmit`, `npm run build`: 통과
- 실제 dev 심사함과 실제 지원서 PDF는 미확인.

## 미사용 점검

- 새 파일: `sidebar-slot.tsx`, `review-sidebar-roles.tsx`.
- 제거: `UndoNotice`와 CSS, `LastDecision`의 `heading`·`next`, 업로드 툴바 CSS, `ReviewUploadPanel`의 children.
- 남김: `EmptyListUndo` 이름(F06).
