# 2026-11-08-pdf-review-fullscreen

PDF 지원자 심사의 한 명씩 보기에서 원본 PDF를 눌러 전체화면으로 보는 기능.

- 도메인·평가표: frontend 평가 규칙, Audit 문서 입구, 이 작업 평가표 v1
- 평가: 독립 평가 1회 (구현 도구와 다른 평가 도구, 읽기 전용). 평가자는 Vitest 실행이 샌드박스에서 막혀 jsdom 재현과 정적 확인으로 판정했다.

## 평가표

| ID | 흐름 | 기대 결과 | 필수 | 독립 평가 | 수정 후 |
| --- | --- | --- | --- | --- | --- |
| R01 | 원본 클릭 | 링크·버튼을 제외한 페이지 클릭으로 펼침 | Y | PASS | PASS |
| R02 | 버튼 | 우측 상단 `전체화면`/`닫기`, 접근 가능한 이름 | Y | PASS | PASS |
| R03 | 맞춤 | 페이지를 화면 높이에 맞추고 폭을 넘지 않음 | Y | FAIL(F02) | PASS: 1.2배 확대 후 진입 시 배율 1, 1400×860에서 585×827 |
| R04 | 닫기 | Esc·닫기, 초점 복귀, 스크롤 잠금 복원 | Y | PASS | PASS |
| R05 | 링크 | 원본 링크·QR 클릭을 가로채지 않음 | Y | PASS | PASS |
| R06 | 기존 소비자 | 합격자 연락처 모달·독립 추출 화면 불변(`expandable` 기본 false) | Y | PASS | PASS |
| R07 | 성능·확대 | Ctrl/Cmd 확대, 근처 페이지만 렌더링 유지 | Y | PASS | PASS |
| R08 | 분석 | 이벤트 의미·분모 변화 없음 | Y | PASS | PASS |
| R09 | 심사 입력 | 전체화면 중 배경 메모·판정 버튼 조작 불가 | Y | FAIL(F01) | PASS: 배경 형제 요소 inert, Tab이 대화상자 안에 머묾 |
| R10 | 코드 규칙 | else·삼항 없음, 작은 함수 | Y | FAIL(F03) | PASS |
| R11 | 정리·문서 | 미사용 코드·임시 파일 없음, design-system 문서 일치 | Y | FAIL(F02와 같은 원인) | PASS |
| R12 | 실제 화면 | dev 데이터의 심사 화면 안에서 fixed 배치 | N | UNVERIFIED | UNVERIFIED |

필수 결과(수정 후): PASS 11 / FAIL 0 / UNVERIFIED 0 / N/A 0. R12는 선택 항목으로 미확인.

## 문제

| 문제 ID | 심각도 | 유형 | 유입 | 발견 경로 | 최초 확정 | 해결 | 최초 PR | 상태 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-11-08-pdf-review-fullscreen-F01 | P2 | FLOW | INTRODUCED | INDEPENDENT_REVIEW | 2026-11-08T12:28:06+09:00 | 2026-11-08T12:30:53+09:00 | #569 | FIXED |
| 2026-11-08-pdf-review-fullscreen-F02 | P2 | FLOW | INTRODUCED | INDEPENDENT_REVIEW | 2026-11-08T12:28:06+09:00 | 2026-11-08T12:30:53+09:00 | #569 | FIXED |
| 2026-11-08-pdf-review-fullscreen-F03 | P3 | CODE | INTRODUCED | INDEPENDENT_REVIEW | 2026-11-08T12:28:06+09:00 | 2026-11-08T12:30:53+09:00 | #569 | FIXED |

- F01: `aria-modal`만 두고 배경을 막지 않아 전체화면 중 뒤쪽 메모·판정 버튼에 초점이 갔다. → 펼친 동안 상위 경로의 형제 요소를 `inert`로 막고 닫을 때 복원. 테스트: 배경 textarea inert 확인, 브라우저에서 Tab 순환과 배경 focus 실패 확인.
- F02: 일반 보기에서 확대한 배율이 전체화면에 남아 페이지가 화면보다 컸다. → 맞춤 방식이 바뀌면 배율을 1로 초기화. 테스트 `맞춤 방식이 바뀌면 이전 확대 배율을 버리고…`, 브라우저 1.2→1 확인.
- F03: 새 컴포넌트·hook이 15·17줄로 여러 책임을 가졌다. → `useEscape`·`useIsolatedLayer`·`useFocusHandoff`로 분리.

집계: 발견 3 = 해결 3 + 미해결 0, P0 0 / P1 0 / P2 2 / P3 1. INDEPENDENT_REVIEW 3, POST_FIX_CHECK 0, PRECHECK 0. 오탐 0. 미확인 1(R12, 선택).

## 사건 이력

| 사건 ID | 문제 ID | 종류 | 시각 | 근거 |
| --- | --- | --- | --- | --- |
| E01 | F01 | CONFIRMED | 2026-11-08T12:28:06+09:00 | 독립 평가 |
| E02 | F02 | CONFIRMED | 2026-11-08T12:28:06+09:00 | 독립 평가 |
| E03 | F03 | CONFIRMED | 2026-11-08T12:28:06+09:00 | 독립 평가 |
| E04 | F01 | FIXED | 2026-11-08T12:30:53+09:00 | vitest 74 통과, 로컬 브라우저 확인 |
| E05 | F02 | FIXED | 2026-11-08T12:30:53+09:00 | vitest 74 통과, 로컬 브라우저 확인 |
| E06 | F03 | FIXED | 2026-11-08T12:30:53+09:00 | eslint 통과 |

## 검증 근거

- `npx vitest run src/components/pdf-extractions src/components/pdf-reviews`: 15파일 74테스트 통과
- `npx eslint src/components/pdf-extractions src/components/pdf-reviews`: 통과
- `tsc --noEmit`: 이번 작업과 무관한 기존 오류 2건(`src/app/design-preview/page.tsx`, `original-screening.test.tsx`의 `guarded`)
- 로컬 임시 페이지(확인 후 삭제)에서 1400×860·375×812 확인. 실제 dev 심사 화면은 미확인.

## 미사용 점검

추가 prop(`expandable`, `fit`)과 스타일은 모두 사용된다. 임시 확인 페이지와 샘플 PDF는 삭제했다.
남은 의심: 전체화면 버튼이 모바일 원본 우측 상단의 링크를 가릴 수 있음(실문서 미확인, 결함 미집계).


---

# 2026-11-08-pdf-review-fullscreen-shortcuts

전체화면에서도 기존 심사 단축키(A 합격·S 보류·D 불합격·N 다음)를 쓰고, 지원자가 바뀌어도 전체화면을 유지하는 후속 작업.
펼침 상태를 `ApplicantFocusReview`로 올리고 `renderDocument(applicant, frame)` → `ReviewOriginalDocument` → 제어형 `PdfExpandableFrame`으로 전달한다.
전체화면은 `data-fullscreen-viewer`로 표시해 단축키의 모달 차단에서 제외한다.

- 평가: 독립 평가 1회 (구현 도구와 다른 평가 도구, 읽기 전용). 평가자는 Vitest 대신 실제 컴포넌트 연결을 jsdom으로 실행했다.

## 평가표

| ID | 기대 결과 | 필수 | 독립 평가 | 수정 후 |
| --- | --- | --- | --- | --- |
| S01 | 전체화면에서 A/S/D 판정, N 다음 | Y | PASS | PASS |
| S02 | 지원자가 바뀌어도 전체화면 유지, 로딩·오류도 안에서 표시 | Y | PASS | PASS |
| S03 | 다른 aria-modal 대화상자가 있으면 단축키 차단 | Y | PASS | PASS |
| S04 | 입력·버튼 초점 차단, 저장 실패 시 이동 금지 유지 | Y | PASS | PASS |
| S05 | 캡션 순번·이름·판정 일치와 갱신 | Y | PASS | PASS |
| S06 | 배경 inert·스크롤 복원, 배율 초기화, Esc 후 초점 복귀 | Y | PASS | PASS(이동 후 초점은 F02로 수정) |
| S07 | 보기 전환·목록 복귀 시 전체화면 상태 초기화 | Y | PASS | PASS |
| S08 | 분석 이벤트 의미 불변(decision_save/next의 shortcut) | Y | PASS | PASS |
| S09 | 합격자 연락처 모달·독립 추출 화면 불변 | Y | PASS | PASS |
| S10 | 코드 규칙, 미사용 없음, 문서 일치 | Y | FAIL(F03) | PASS |
| S11 | 실제 dev 심사 화면 확인 | N | UNVERIFIED | UNVERIFIED |

필수 결과(수정 후): PASS 10 / FAIL 0 / UNVERIFIED 0 / N/A 0. S11은 선택 항목으로 미확인.

## 문제

| 문제 ID | 심각도 | 유형 | 유입 | 발견 경로 | 최초 확정 | 해결 | 최초 PR | 상태 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-11-08-pdf-review-fullscreen-shortcuts-F01 | P2 | FLOW | INTRODUCED | INDEPENDENT_REVIEW | 2026-11-08T13:26:11+09:00 | 2026-11-08T13:28:59+09:00 | #569 | FIXED |
| 2026-11-08-pdf-review-fullscreen-shortcuts-F02 | P2 | FLOW | INTRODUCED | INDEPENDENT_REVIEW | 2026-11-08T13:26:11+09:00 | 2026-11-08T13:28:59+09:00 | #569 | FIXED |
| 2026-11-08-pdf-review-fullscreen-shortcuts-F03 | P3 | CODE | INTRODUCED | INDEPENDENT_REVIEW | 2026-11-08T13:26:11+09:00 | 2026-11-08T13:28:59+09:00 | #569 | FIXED |

- F01: 판정·자동 저장 실패 안내가 전체화면 밖(메모 쪽은 inert)에 있어 보이지 않았다. → `saveError`를 BoardContext로 넘기고 자동 저장 오류와 함께 전체화면 캡션의 `role="alert"`로 표시. 1024px 미만에서도 오류만은 보인다. 테스트로 alert 문구 확인, 800×700 브라우저에서 닫기 버튼과 겹치지 않음 확인.
- F02: 지원자 이동 시 부모 section의 초점 효과가 자식의 dialog 초점을 덮어 초점이 대화상자 밖으로 나갔다. → 전체화면일 때 section 초점 이동을 생략. 테스트로 판정 후 `activeElement === dialog` 확인.
- F03: 새 테스트의 삼항 연산자. → 실제 `PdfExpandableFrame`을 연결한 테스트로 교체.

집계: 발견 3 = 해결 3 + 미해결 0, P0 0 / P1 0 / P2 2 / P3 1. INDEPENDENT_REVIEW 3, POST_FIX_CHECK 0, PRECHECK 0. 오탐 0. 미확인 1(S11, 선택).

## 사건 이력

| 사건 ID | 문제 ID | 종류 | 시각 | 근거 |
| --- | --- | --- | --- | --- |
| S-E01 | shortcuts-F01 | CONFIRMED | 2026-11-08T13:26:11+09:00 | 독립 평가 |
| S-E02 | shortcuts-F02 | CONFIRMED | 2026-11-08T13:26:11+09:00 | 독립 평가 |
| S-E03 | shortcuts-F03 | CONFIRMED | 2026-11-08T13:26:11+09:00 | 독립 평가 |
| S-E04 | shortcuts-F01 | FIXED | 2026-11-08T13:28:59+09:00 | vitest 75 통과, 로컬 브라우저 확인 |
| S-E05 | shortcuts-F02 | FIXED | 2026-11-08T13:28:59+09:00 | vitest 75 통과 |
| S-E06 | shortcuts-F03 | FIXED | 2026-11-08T13:28:59+09:00 | eslint 통과 |

## 검증 근거

- `npx vitest run src/components/pdf-extractions src/components/pdf-reviews`: 16파일 75테스트 통과
- `npx eslint src/components/pdf-extractions src/components/pdf-reviews`: 통과, `tsc --noEmit`: 기존 무관 오류 2건만
- 로컬 임시 페이지(확인 후 삭제): 1400×860 캡션 표시, 800×700 오류 안내 표시. 실제 dev 심사 화면은 미확인.

## 미사용 점검

앞 작업의 `PdfOriginalViewer`의 `expandable` prop은 제어형 `PdfExpandableFrame`으로 옮기며 제거했다. 새 prop(`frame`, `fit`, `saveError`)과 스타일은 모두 사용된다.
남은 의심: 1024px 부근 화면에서 캡션(최소 200px)이 세로 PDF와 겹칠 가능성, 모바일에서 오류 안내가 원본 상단을 가릴 수 있음(실기기 미확인, 결함 미집계).
