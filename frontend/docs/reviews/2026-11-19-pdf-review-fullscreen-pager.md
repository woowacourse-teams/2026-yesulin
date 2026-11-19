# 2026-11-19-pdf-review-fullscreen-pager

PDF 지원자 심사 전체화면을 쪽 넘김 중심으로 바꾸는 작업.
← →는 원본을 한 화면씩 넘기고, 원본 아래 밝은 반투명 막대에서 불합격(A)·보류(S)·합격(D)을 고른다.
판정 도장을 0.4초 보여 준 뒤 저장하고, 직전 판정을 되돌리기(Z)로 되돌린다. 배우 이름 입력을 없애고 지원서 번호로 부른다.

- 도메인·평가표: frontend 평가 규칙, Audit 문서 입구, Audit 평가표 v1(A01~A04·A07 N/A: 프론트 표시와 기존 판정 API 재사용), 이 작업 평가표 v1
- 평가: 독립 평가 1회(읽기 전용). 우선 평가 도구가 계정에서 설정 모델을 지원하지 않아 같은 종류의 별도 에이전트로 대체했다.

## 평가표

| ID | 흐름 | 기대 결과 | 필수 | 독립 평가 | 수정 후 |
| --- | --- | --- | --- | --- | --- |
| R01 | 쪽 넘김 | 전체화면에서만, 입력·수정키·조합 중 무시, 마지막 화면 정지·안내, 스크롤 추적, 재진입 정상 | Y | FAIL(F01, F02) | PASS: 다시 열 때 현재 줄 재계산·안내 횟수 초기화, 줄이 없으면 비활성 |
| R02 | 판정·단축키 | A 불합격·S 보류·D 합격, 중복 차단, 도장 후 저장, 실패 시 도장 정리·이동 없음 | Y | PASS(F08 테스트 부족) | PASS: 실패·도장 중 중복 키 테스트 추가 |
| R03 | 되돌리기 | 직전 판정을 정확한 대상에 되돌리고 그 지원서로 이동, 목록이 비어도 가능 | Y | FAIL(F03) | PASS: 직전 판정을 심사함 단위로 보관, 빈 목록에서도 되돌리기와 Z |
| R04 | 분석 | `decision_undo` 계약·대시보드·문서 일치, 기존 지표 의미 유지, 판정 값 미전송 | Y | FAIL(F04, F05) | PASS: ③ 버튼 조작 수에서 제외, 이벤트 테스트 추가 |
| R05 | 접근성 | 막대·되돌리기 접근 가능한 이름, 전체화면 안에서 조작 가능 | Y | PASS(F09 경미) | PASS, F09 미해결 |
| R06 | 이름 제거·번호 | 필터·추가 업로드와 무관하게 같은 번호, 목록과 대응, 미사용 정리 | Y | FAIL(F06, F07) | PASS: 생성 순서(ID) 번호, 카드·표에도 번호, 미사용 heading 제거. 자동 저장의 title 필드는 남김 |
| R07 | 규칙·문서 | 코드 규칙, design-system·analytics·audit flow·API 문서 일치 | Y | FAIL(F10, F11) | PASS |
| R08 | 회귀 | 바뀐 기대값 타당, 확대·QR·렌더 큐 영향 없음 | Y | PASS(F12 미확인) | PASS: 확대 중에는 쪽 맞춤 스냅을 끔. 실제 핀치 확대는 UNVERIFIED |
| R09 | 실제 화면 | dev 실제 심사함에서 확인 | N | UNVERIFIED | UNVERIFIED |

필수 결과(수정 후): PASS 8 / FAIL 0 / UNVERIFIED 0 / N/A 0. R09와 F12의 실제 핀치 확대는 선택 미확인.

## 문제

| 문제 ID | 심각도 | 유형 | 유입 | 발견 경로 | 최초 확정 | 해결 | 최초 PR | 상태 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-11-19-pdf-review-fullscreen-pager-F01 | P2 | FLOW | INTRODUCED | INDEPENDENT_REVIEW | 2026-11-19T10:20:00+09:00 | 2026-11-19T10:28:47+09:00 | PENDING | FIXED |
| 2026-11-19-pdf-review-fullscreen-pager-F02 | P3 | CODE | INTRODUCED | INDEPENDENT_REVIEW | 2026-11-19T10:20:00+09:00 | 2026-11-19T10:28:47+09:00 | PENDING | FIXED |
| 2026-11-19-pdf-review-fullscreen-pager-F03 | P2 | FLOW | INTRODUCED | INDEPENDENT_REVIEW | 2026-11-19T10:20:00+09:00 | 2026-11-19T10:28:47+09:00 | PENDING | FIXED |
| 2026-11-19-pdf-review-fullscreen-pager-F04 | P2 | POLICY | INTRODUCED | INDEPENDENT_REVIEW | 2026-11-19T10:20:00+09:00 | 2026-11-19T10:28:47+09:00 | PENDING | FIXED |
| 2026-11-19-pdf-review-fullscreen-pager-F05 | P2 | TEST | INTRODUCED | INDEPENDENT_REVIEW | 2026-11-19T10:20:00+09:00 | 2026-11-19T10:28:47+09:00 | PENDING | FIXED |
| 2026-11-19-pdf-review-fullscreen-pager-F06 | P2 | FLOW | INTRODUCED | INDEPENDENT_REVIEW | 2026-11-19T10:20:00+09:00 | 2026-11-19T10:28:47+09:00 | PENDING | FIXED |
| 2026-11-19-pdf-review-fullscreen-pager-F07 | P3 | UNUSED | INTRODUCED | INDEPENDENT_REVIEW | 2026-11-19T10:20:00+09:00 | - | PENDING | OPEN |
| 2026-11-19-pdf-review-fullscreen-pager-F08 | P3 | TEST | INTRODUCED | INDEPENDENT_REVIEW | 2026-11-19T10:20:00+09:00 | 2026-11-19T10:28:47+09:00 | PENDING | FIXED |
| 2026-11-19-pdf-review-fullscreen-pager-F09 | P3 | CODE | INTRODUCED | INDEPENDENT_REVIEW | 2026-11-19T10:20:00+09:00 | - | PENDING | OPEN |
| 2026-11-19-pdf-review-fullscreen-pager-F10 | P3 | CODE | INTRODUCED | INDEPENDENT_REVIEW | 2026-11-19T10:20:00+09:00 | 2026-11-19T10:28:47+09:00 | PENDING | FIXED |
| 2026-11-19-pdf-review-fullscreen-pager-F11 | P3 | DOC | INTRODUCED | INDEPENDENT_REVIEW | 2026-11-19T10:20:00+09:00 | 2026-11-19T10:28:47+09:00 | PENDING | FIXED |
| 2026-11-19-pdf-review-fullscreen-pager-F12 | P3 | CODE | INTRODUCED | INDEPENDENT_REVIEW | 2026-11-19T10:20:00+09:00 | 2026-11-19T10:28:47+09:00 | PENDING | FIXED |

- F01: 같은 지원서에서 전체화면을 닫았다 다시 열면 이전 쪽 위치·안내 횟수가 남았다. → 켜질 때 현재 줄을 다시 계산하고 안내 횟수를 0으로.
- F02: 원본을 불러오는 중 "1 / 0쪽"과 마지막 쪽 안내가 잘못 보였다. → 줄이 없으면 쪽 넘김을 끈다.
- F03: 탭의 마지막 지원서를 판정하면 목록이 비면서 되돌리기가 사라졌다. → 직전 판정을 심사함 화면이 보관하고, 빈 목록 안내 위에 되돌리기(버튼·Z)를 둔다.
- F04: 대시보드 ③ 버튼 조작 수에 되돌리기가 섞였다. → ③에서 `decision_undo`를 빼고 설명을 고쳤다. 작업별 표에는 따로 보인다.
- F05: `decision_undo` 기록 테스트가 없었다. → 버튼·Z 각 1회, 판정 값 미전송 테스트 추가.
- F06: 번호가 파일 이름순이라 "올린 순서" 설명과 달랐고 새 파일이 앞 번호를 밀었다. 카드·표와 대응도 안 됐다. → 지원서 ID(생성 순서)로 번호를 매기고 카드·표에도 같은 번호를 보인다.
- F07: 화면에서 쓰지 않는 자동 저장 `title` 필드와 MSW `/title` 통과 경로가 남아 있다. API는 유지하므로 MSW 경로는 그대로 두고, `title` 필드는 자동 저장 저장소 공통 구조라 이번에는 남긴다. 제거 조건: 제목 API를 지우거나 자동 저장을 메모 전용으로 정리할 때. 쓰지 않는 `heading`은 지웠다.
- F08: 도장 후 저장 실패와 도장 중 중복 키 테스트가 없었다. → 추가.
- F09: 되돌리기·마지막 쪽 안내의 `role="status"`가 내용을 가진 채 새로 붙어 일부 화면 낭독기가 읽지 않을 수 있다. 화면 표시는 정상이라 이번에는 남긴다.
- F10: 새 설명 주석이 많았다. → 이름으로 드러나는 주석을 지우고, 도장을 저장보다 먼저 보이는 이유만 남겼다.
- F11: 제목 입력 전제의 옛 문서가 남았다. → design-system과 백엔드 API 문서를 고쳤다.
- F12: 확대 중에도 쪽 맞춤 스냅이 걸려 확대 기준 스크롤을 다시 맞출 수 있었다. → 확대 배율이 1이 아니면 스냅을 끈다. 실제 핀치 확대는 미확인.

집계: 발견 12 = 해결 10 + 미해결 2, P0 0 / P1 0 / P2 6 / P3 6. INDEPENDENT_REVIEW 12, POST_FIX_CHECK 0, PRECHECK 0. 오탐 0. 미확인 1(R09, 선택).

## 사건 이력

| 사건 ID | 문제 ID | 종류 | 시각 | 근거 |
| --- | --- | --- | --- | --- |
| E01~E12 | F01~F12 | CONFIRMED | 2026-11-19T10:20:00+09:00 | 독립 평가 |
| E13 | F01, F02, F03, F04, F05, F06, F08, F10, F11, F12 | FIXED | 2026-11-19T10:28:47+09:00 | vitest 144파일 831테스트, eslint, build 통과 |

## 검증 근거

- 개발 전 사전 확인(구현자): 로컬 임시 페이지에서 표본 PDF(세로 3쪽, 가로 2쪽, 섞인 5쪽, 세로로 긴 1쪽)로 1440×900 전체화면 쪽 넘김, 마지막 쪽 안내, D 판정 도장 표시 후 이동, 되돌리기 알림과 Z 복귀를 확인했다. 임시 페이지와 표본 PDF는 커밋하지 않았다.
- `npx vitest run src/components/pdf-reviews src/components/pdf-extractions src/features`: 144파일 831테스트 통과(수정 후)
- 전체 `npx vitest run`: 이번 변경과 무관한 `actor-screen-view.test.tsx` 6건이 로컬 테스트 환경 오류로 실패(변경 전과 같음)
- `npx eslint src/components src/features scripts/posthog`, `npm run build`: 통과
- 실제 dev 심사함과 실제 지원서 PDF는 미확인.

## 미사용 점검

- 새 파일: `pdf-pager.ts`(+테스트), `fullscreen-dock.tsx`(+CSS), `empty-list-undo.tsx`.
- 제거: `review-document-heading.tsx`, 화면의 `renameTitle`, `renamePdfReviewEntry`, `applicantListLabel().heading`.
- 남김: 백엔드 제목 API와 MSW 통과 경로(API 유지), 자동 저장 `title` 필드(F07).
