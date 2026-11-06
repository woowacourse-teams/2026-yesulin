# 홈 많이 본 공고 순위·단체명 겹침 수정 평가

- 작업 ID: `2026-11-06-frontend-popular-poster`
- 평가일: 2026-11-06, Asia/Seoul
- 대상: `NotebookPostCard`의 순위 카드 기본 포스터, 기준 `origin/dev` ded3319d
- 독립 평가: 1회 완료. 구현 Claude, 평가 Codex(읽기 전용). 수정 후 검증은 구현자가 수행했고 재귀 평가는 하지 않는다.
- 기준: 최상위 AGENTS → frontend/AGENTS → frontend/docs/AGENTS, design-system.md. 순수 UI 변경이라 정본 문서 갱신은 없다.
- 판정: 통과. 미해결 문제 없음. 실제 휴대폰 확인은 미확인이다.

## 변경 요약

홈 "많이 본 공고" 줄에서 이미지가 없는 공고의 기본 포스터는 순위 숫자와 단체 이름이 모두 왼쪽 아래에 놓여 겹쳤다.
순위가 있는 카드는 기본 포스터 안의 단체 이름을 렌더링하지 않는다. 분야·단체명은 카드 아래 byline에 그대로 남는다.
순위가 없는 카드(새로 올라온·마감 임박 줄, 목록)와 이미지 카드는 바뀌지 않는다.

## 평가표 popular-poster-v1

| ID | 흐름 / 실패 조건 | 기대 결과 | 검증 방법·근거 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| R01 | 순위 카드 기본 포스터 | 순위와 단체 이름이 겹치지 않음 | MSW 개발 서버 1440px·375px 스크린샷, 순위와 포스터 내부 요소 사각형 교차 0건 | 예 | PASS |
| R02 | 순위 없는 카드 | 기존처럼 단체 이름 표시 | 홈에서 mark 6개 유지, `notebook-post-card.test` | 예 | PASS |
| R03 | 이미지 카드·이미지 실패 fallback | 이미지 카드는 그대로, 실패 시 기본 포스터도 단체 이름 없음 | 1440px에서 4위 이미지 src를 깨뜨려 fallback 렌더 확인, mark 없음 | 예 | PASS |
| R04 | 정보·접근성 | byline에 분야·단체명 유지, 포스터 `aria-hidden`과 순위 `aria-label` 유지 | 단위 테스트(byline 문자열, `aria-label="1위"`), 코드 대조. 보조기술 실기 미실행 | 예 | PASS |
| R05 | 코드 규칙 | else·삼항 없음, 동작을 반복하는 주석 없음 | 정적 검토, ESLint. F01 수정 후 원래 주석 한 줄만 남음 | 예 | PASS |
| R06 | 미사용 정리·문서 | mark/rank CSS는 계속 사용, 새 테스트는 컴포넌트 옆, 문서 갱신 불필요 | 평가자 참조 검토 | 예 | PASS |
| R07 | lint·테스트 | lint 통과, 관련 테스트 통과 | `npm run lint` 통과, audition-posts·landing·home 38개 통과. 전체 실행의 `actor-screen-view.test` 6개 실패는 Node 26 전역 `localStorage`가 `undefined`라 jsdom 값을 가리는 환경 문제이며 변경 파일과 import 관계 없음 | 예 | PASS |
| R08 | 두 자리 순위 | 10위도 다른 요소와 겹치지 않음 | 1440px에서 순위를 10으로 바꿔 교차 0건, 스크린샷 | 아니오 | PASS |
| R09 | 실제 휴대폰 | 터치·스크롤 체감 | 미실행 | 아니오 | UNVERIFIED |

필수 PASS 7 / FAIL 0 / UNVERIFIED 0, 선택 PASS 1 / UNVERIFIED 1. 검증률 7/7.

평가자 환경은 읽기 전용이라 Vitest 임시 파일을 만들지 못해 R03·R04·R07을 UNVERIFIED로 냈다. 구현자가 위 근거로 수정 후 확인했다.
공연 포스터 줄은 별도 `ShowPosterCard`라 순위·mark 충돌 경로가 없다(평가자 확인).

## 확정 문제와 조치

| 문제 ID | 심각도·유형·유입 | 발견 경로 | 최초 확정 / 최초 PR | 해결 시각 | 근거·조치·상태 |
| --- | --- | --- | --- | --- | --- |
| 2026-11-06-frontend-popular-poster-F01 | P3·CODE·INTRODUCED | INDEPENDENT_REVIEW | 2026-11-06T11:12:00+09:00 / PENDING | 2026-11-06T11:14:00+09:00 | `DefaultPoster` 주석에 `showMark` 동작을 반복하는 문장 추가. 원래 한 줄 주석으로 되돌림, lint·테스트 통과. FIXED |

## 사건 이력

| 사건 ID | 문제 ID | 종류 | 시각 | 근거 |
| --- | --- | --- | --- | --- |
| E01 | 2026-11-06-frontend-popular-poster-F01 | CONFIRMED | 2026-11-06T11:12:00+09:00 | 독립 평가 R05 |
| E02 | 2026-11-06-frontend-popular-poster-F01 | FIXED | 2026-11-06T11:14:00+09:00 | 주석 원복, lint 통과 |

## 집계

발견 1 / 해결 1 / 미해결 0, P0 0 / P1 0 / P2 0 / P3 1, 발견 경로 INDEPENDENT_REVIEW 1, 오탐 0, 미확인 1(선택 R09).
