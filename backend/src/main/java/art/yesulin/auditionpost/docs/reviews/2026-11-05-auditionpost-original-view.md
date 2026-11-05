# 공고 원문 크게 보기

작업 ID `2026-11-05-auditionpost-original-view`, 평가일 2026-11-05, 공고 v1(이번 작업에서 도메인 문서 최초 작성).
공고 상세 본문 사진(대개 포스터)을 전체 화면 뷰어로 보는 버튼과 사진 클릭 진입을 추가한다. API·조회수·분석 이벤트는 바꾸지 않는다.

| ID | 흐름 단계 / 실패 경계 | 기대 결과 | 검증 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| V1 | 버튼·사진 클릭으로 열기, Esc·닫기 | 버튼은 첫 사진, 사진 클릭은 그 사진부터. Esc로 닫힘 | jsdom 테스트, 로컬 MSW 브라우저(PC·375px) | Y | PASS |
| V2 | 링크로 감싼 사진 | 뷰어 대신 링크 이동 | jsdom 테스트 | Y | PASS |
| V3 | 사진 없는 글 공고, 서버 렌더링 | 버튼 없음, 서버·브라우저 목록 동일 | jsdom 테스트, 순수 함수 코드 검토 | Y | PASS |
| V4 | 서버 정리 HTML의 src와 DOM src 일치 | 문자 참조·속성 경계를 같게 해석 | 단위 테스트, 평가자의 jsoup 1.23.2 재현 | Y | PASS(수정 후) |
| V5 | 관리자 미리보기·조회수·첨부·출처 링크 | 기존 동작 유지 | 코드 검토, 기존 테스트 | Y | PASS |
| V6 | 코드 작성 규칙 | else·삼항 없음, 10줄 이내 | 코드 검토, eslint | Y | PASS |
| V7 | 미사용 코드·문서 링크 | 미사용 없음, 링크 정상 | 평가자 점검 | Y | PASS(수정 후) |

제외: 권한·상태 전이·재시도 중복은 해당 없음(공개 읽기 화면, 서버 요청 추가 없음).

## 실행 근거

- `npx vitest run` 대상 2파일 9테스트 통과. `npm run lint` 종료0.
- 전체 `npm test`: 170파일 중 `actor-pages/actor-screen-view.test.tsx` 6개 실패. 이번 변경을 stash한 상태에서도 같게 실패해 기존 문제로 보고 이번 집계에 넣지 않는다.
- `tsc --noEmit` 오류는 미추적 `src/app/design-preview`와 `.next` 생성 타입에서만 나며 이번 변경과 무관하다. `npm run build`는 다른 세션의 dev 서버가 실행 중이라 실행하지 않았다.
- 로컬 MSW(`localhost:3100`, 공고 1번)에서 PC 버튼 열기 → 포스터 전체가 한 화면에 맞춰 표시, Esc 닫기, 본문 사진 클릭 열기, `zoom-in` 커서를 확인했다. 375px에서도 사진 탭으로 같은 뷰어가 열렸다.

## 독립 평가 1회

2026-11-05 읽기 전용 별도 평가 1회. 상대 도구를 쓸 수 없어 같은 종류의 별도 평가자로 대체했다. 신규 확정 3건, 오탐 1건.

| 문제 ID | 심각도 / 유형 / 유입 | 발견 경로 | 상태 | 근거·조치 |
| --- | --- | --- | --- | --- |
| 2026-11-05-auditionpost-original-view-F01 | P2 / DOC / INTRODUCED | INDEPENDENT_REVIEW | FIXED | README의 평가 링크 대상이 없었음. 이 기록을 작성해 해소 |
| 2026-11-05-auditionpost-original-view-F02 | P3 / CODE / INTRODUCED | INDEPENDENT_REVIEW | FIXED | jsoup이 U+00A0을 `&nbsp;`로 내보내 src가 DOM과 달라짐. `&nbsp;` 디코드와 테스트 추가 |
| 2026-11-05-auditionpost-original-view-F03 | P3 / CODE / INTRODUCED | INDEPENDENT_REVIEW | FIXED | `alt="q src="`를 주소로 읽음. 속성을 경계 단위로 읽게 바꾸고 테스트 추가 |
| 2026-11-05-auditionpost-original-view-F04 | P3 / DOC / INTRODUCED | INDEPENDENT_REVIEW | REJECTED | 도메인 README에 평가표 연결이 없다는 지적. 일정표 도메인과 같은 구성이며 평가표는 작업별 기록에 둔다 |

| 사건 ID | 문제 ID | 사건 종류 | 발생 시각 | 근거 | 최초 PR |
| --- | --- | --- | --- | --- | --- |
| E01 | F01 | CONFIRMED | 2026-11-05T13:47:00+09:00 | 평가 보고 | PENDING |
| E02 | F02 | CONFIRMED | 2026-11-05T13:47:00+09:00 | 평가자 jsoup 재현 | PENDING |
| E03 | F03 | CONFIRMED | 2026-11-05T13:47:00+09:00 | 평가자 node 재현 | PENDING |
| E04 | F04 | REJECTED | 2026-11-05T13:48:49+09:00 | 일정표 README 구성 대조 | PENDING |
| E05 | F02 | FIXED | 2026-11-05T13:48:49+09:00 | body-images 테스트 통과 | PENDING |
| E06 | F03 | FIXED | 2026-11-05T13:48:49+09:00 | body-images 테스트 통과 | PENDING |
| E07 | F01 | FIXED | 2026-11-05T13:50:00+09:00 | 이 파일 작성 | PENDING |

## 후속 변경: 터치 화면 확대 버튼 감춤

사용자 확인 후 요청으로 공용 `ImageLightbox`의 2배 확대 버튼을 터치 화면에서 감췄다. 한 장짜리 뷰어는 하단 막대도 감춘다.
로컬 MSW 375px 모바일 에뮬레이션(`pointer: coarse` true)에서 버튼·막대 비표시, 데스크톱(`coarse` false)에서 버튼 표시를 확인했다.
공연 상세·이벤트·배우 갤러리에도 같은 규칙이 적용되며 그 화면들은 코드 공유로만 판단하고 따로 열어 보지 않았다. 신규 문제 0건.

## 판정

필수 PASS7 / FAIL0 / UNVERIFIED0 / N/A0, 검증률 7/7.
신규 발견3 / 해결3 / 미해결0, P0=0 P1=0 P2=1 P3=2. PRECHECK0 / INDEPENDENT_REVIEW3 / POST_FIX_CHECK0 / EXTERNAL0, 오탐1.
미확인: 사진 클릭으로 연 뒤 닫을 때의 포커스 복귀(기존 `ModalShell` 동작), 실제 iOS·Android 손가락 확대, 운영 데이터 전체 공고, `npm run build`.
