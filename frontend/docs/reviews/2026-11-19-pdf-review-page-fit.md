# 2026-11-19-pdf-review-page-fit

PDF 지원자 심사의 원본 보기를 쪽 모양에 맞춰 묶어 보여 주는 작업. 쪽마다 원본 영역 높이에 맞추고,
한 화면에 통째로 들어가는 쪽끼리 한 줄에 나란히 놓는다. 세로로 긴 이미지는 따로 세로 스크롤한다.
기본 보기와 전체화면 모두 같은 규칙이며, 합격자 연락처 등 다른 원본 보기는 너비 맞춤 그대로다.

- 도메인·평가표: frontend 평가 규칙, Audit 문서 입구, Audit 평가표 v1(A01~A07 N/A: 프론트 표시만 변경), 이 작업 평가표 v1
- 평가: 독립 평가 1회(읽기 전용). 우선 평가 도구가 계정에서 설정 모델을 지원하지 않아 실행되지 않았고, 같은 종류의 별도 에이전트로 대체했다.

## 평가표

| ID | 흐름 | 기대 결과 | 필수 | 독립 평가 | 수정 후 |
| --- | --- | --- | --- | --- | --- |
| R01 | 쪽 묶음 | 세로 여러 장, 가로, 섞인 문서, 긴 이미지, 미측정, 모바일에서 화면 폭을 넘지 않음 | Y | PASS(F01 P3) | PASS: 미측정도 좌우 여백을 뺀 폭 사용, 테스트 갱신 |
| R02 | 기존 렌더 | 근처 쪽만 렌더, bitmap 해제, 확대, 앵커, 재시도, 링크·QR 유지 | Y | FAIL(F02, F03) | PASS: 보기 범위가 바뀌면 배율 초기화. F03은 미해결(P3) |
| R03 | 전체화면 스타일 | 배경, 여백, 간격 충돌 없음 | Y | PASS(F04 P3) | PASS: 효과 없는 `.expanded .document` 규칙 삭제 |
| R04 | 다른 소비자 | 합격자 연락처, 추출 확인 화면은 너비 맞춤 유지 | Y | PASS | PASS |
| R05 | 분석 | 원본 스크롤·확대는 이벤트 없음, 의미·분모 불변 | Y | PASS | PASS |
| R06 | 정리·코드 규칙 | 미사용 export·분기 없음, else·삼항 없음, 작은 함수 | Y | FAIL(F05) | PASS: `fittedPageWidth` 제거, 테스트 이동 |
| R07 | 문서 | design-system 서술과 코드 일치 | Y | FAIL(F02와 같은 원인) | PASS |
| R08 | 실제 화면 | 실제 지원서 PDF로 dev 심사 화면 확인 | N | UNVERIFIED | UNVERIFIED |

필수 결과(수정 후): PASS 7 / FAIL 0 / UNVERIFIED 0 / N/A 0. R08은 선택 항목으로 미확인.

## 문제

| 문제 ID | 심각도 | 유형 | 유입 | 발견 경로 | 최초 확정 | 해결 | 최초 PR | 상태 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-11-19-pdf-review-page-fit-F01 | P3 | CODE | INTRODUCED | INDEPENDENT_REVIEW | 2026-11-19T00:53:00+09:00 | 2026-11-19T00:56:19+09:00 | #616 | FIXED |
| 2026-11-19-pdf-review-page-fit-F02 | P2 | FLOW | INTRODUCED | INDEPENDENT_REVIEW | 2026-11-19T00:53:00+09:00 | 2026-11-19T00:56:19+09:00 | #616 | FIXED |
| 2026-11-19-pdf-review-page-fit-F03 | P3 | CODE | INTRODUCED | INDEPENDENT_REVIEW | 2026-11-19T00:53:00+09:00 | - | #616 | OPEN |
| 2026-11-19-pdf-review-page-fit-F04 | P3 | UNUSED | INTRODUCED | INDEPENDENT_REVIEW | 2026-11-19T00:53:00+09:00 | 2026-11-19T00:56:19+09:00 | #616 | FIXED |
| 2026-11-19-pdf-review-page-fit-F05 | P3 | UNUSED | INTRODUCED | INDEPENDENT_REVIEW | 2026-11-19T00:53:00+09:00 | 2026-11-19T00:56:19+09:00 | #616 | FIXED |

- F01: 높이를 아직 못 잰 순간에는 좌우 여백을 빼지 않은 폭을 써 잠깐 가로로 넘칠 수 있었다. → 미측정도 여백을 뺀 폭을 쓴다.
- F02: 기본 보기와 전체화면이 같은 맞춤이 되어, 확대한 배율이 전체화면을 오갈 때 남았다(관련: 2026-11-08-pdf-review-fullscreen-F02와 같은 증상의 재발, 원인은 맞춤 값 통일). → 뷰어에 보기 범위(`zoomScope`)를 넘겨 바뀌면 배율을 1로 되돌린다. 테스트 `같은 맞춤이어도 보기 범위가 바뀌면…`.
- F03: 줄 key가 첫 쪽 번호라, 쪽 크기 정보가 늦게 와 줄 구성이 바뀌면 줄을 옮긴 쪽이 다시 그려진다. 대부분 렌더 전 초기 시점이고 폭이 바뀌면 어차피 다시 렌더하므로 이번에는 고치지 않는다.
- F04: 새 규칙이 `.expanded .document`의 모든 속성을 덮어 그 규칙이 쓰이지 않았다. → 삭제.
- F05: `fittedPageWidth` 재export와 page 분기가 테스트에서만 쓰였다. → 함수를 없애고 테스트를 `pdf-page-rows.test.ts`로 옮겼다.

집계: 발견 5 = 해결 4 + 미해결 1, P0 0 / P1 0 / P2 1 / P3 4. INDEPENDENT_REVIEW 5, POST_FIX_CHECK 0, PRECHECK 0. 오탐 0. 미확인 1(R08, 선택).

## 사건 이력

| 사건 ID | 문제 ID | 종류 | 시각 | 근거 |
| --- | --- | --- | --- | --- |
| E01 | F01 | CONFIRMED | 2026-11-19T00:53:00+09:00 | 독립 평가 |
| E02 | F02 | CONFIRMED | 2026-11-19T00:53:00+09:00 | 독립 평가 |
| E03 | F03 | CONFIRMED | 2026-11-19T00:53:00+09:00 | 독립 평가 |
| E04 | F04 | CONFIRMED | 2026-11-19T00:53:00+09:00 | 독립 평가 |
| E05 | F05 | CONFIRMED | 2026-11-19T00:53:00+09:00 | 독립 평가 |
| E06 | F01 | FIXED | 2026-11-19T00:56:19+09:00 | 쪽 묶음 테스트 갱신, vitest 통과 |
| E07 | F02 | FIXED | 2026-11-19T00:56:19+09:00 | 배율 초기화 테스트 추가, vitest 통과 |
| E08 | F04 | FIXED | 2026-11-19T00:56:19+09:00 | CSS 규칙 삭제, build 통과 |
| E09 | F05 | FIXED | 2026-11-19T00:56:19+09:00 | eslint, vitest 통과 |

## 검증 근거

- `npx vitest run src/components/pdf-extractions src/components/pdf-reviews`: 18파일 86테스트 통과(수정 후)
- 전체 `npx vitest run`: 이번 변경과 무관한 `actor-screen-view.test.tsx` 6건 실패(단독 실행에서도 같은 환경 오류), 나머지 통과
- `npx eslint src/components/pdf-extractions src/components/pdf-reviews`: 통과
- `npm run build`: 통과
- 로컬 임시 페이지(확인 후 삭제)에서 1440×900, 세로 3쪽, 가로 1쪽, 섞인 5쪽, 세로로 긴 1쪽, 전체화면 배치를 확인. 실제 지원서 PDF와 dev 심사 화면은 미확인.

## 미사용 점검

- 새 파일: `pdf-page-rows.ts`(뷰어가 사용), `pdf-page-rows.test.ts`.
- 제거: `fittedPageWidth`와 그 재export, `.expanded .document` 규칙. 임시 확인 페이지와 표본 PDF는 커밋하지 않았다.
- `PdfFit` 재export는 `pdf-expandable-frame`, `pdf-original-viewer`, `review-original-document`가 계속 쓴다.
