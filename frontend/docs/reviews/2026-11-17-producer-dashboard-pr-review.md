# 공연사 대시보드 PR 리뷰 반영

- 작업 ID `2026-11-17-producer-dashboard-pr-review`
- 평가일 2026-11-17, Asia/Seoul. [공연사 흐름](../user-flows/producer.mmd)과 [디자인 시스템](../design-system.md)을 기준으로 독립 평가 1회와 표적 재검증을 수행했다.
- 기준 PR [#599](https://github.com/woowacourse-teams/2026-yesulin/pull/599).

| ID | 흐름과 실패 조건 | 기대 결과 | 검증 방법과 근거 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| R01 | 공연 목록 응답을 기다리는 동안 회차가 시작되거나 재조회가 같은 회차를 반환함 | 응답이 없는 동안 마지막 검사 기준을 유지한다. 응답 도착 시 다음 회차를 다시 조회하고 지난 회차를 숨긴다. 같은 회차로 반복 조회하지 않는다. | 가짜 시계와 지연 응답을 사용한 화면 회귀 테스트 2건. 탭 포커스가 있거나 없이 응답하는 경우와 같은 회차 재응답을 검증했다. | 예 | PASS |
| R02 | 이메일 인증 대기 상태가 조회 성공 후 빈 목록으로 표시됨 | 인증 대기 안내를 표시하고 접수 목록을 요청하지 않는다. 인증을 마치면 기존 로딩·빈 목록·실패 상태를 사용한다. | 상태 전환 통합 테스트와 390px 브라우저. 인증 대기 fixture에서 목록 요청이 한 번도 들어오지 않았다. | 예 | PASS |
| R03 | 좁은 메뉴에서 번호나 긴 접수 공고 제목을 끝까지 읽을 수 없음 | 일반 줄바꿈과 긴 단어 줄바꿈으로 제목 전체를 표시한다. | 제목·번호 표시 테스트와 데스크톱 사이드바 최소 190px·390px 모바일 브라우저. 5줄과 3줄로 표시되고 가로 넘침이 없었다. | 예 | PASS |
| R04 | 상세 페이지의 선택 표시가 보조기기에 전달되지 않음 | 같은 주소는 `aria-current="page"`, 하위 경로의 상위 메뉴는 `aria-current="location"`을 제공한다. | 대시보드·공고 목록·수정 경로의 속성 테스트와 실제 접수 공고 상세의 상위·개별 링크 속성 확인. | 예 | PASS |
| R05 | 후속 수정으로 기존 흐름이나 빌드가 깨지거나 미사용 항목이 남음 | 기존 조회 경계를 유지하고 전체 테스트·린트·빌드를 통과한다. | 프론트 전체 1,188건, ESLint, 프로덕션 빌드, diff 검사, 독립 참조 검토. | 예 | PASS |

| 문제 ID | 심각도·유형·유입 | 발견 경로 | 최초 확정 / 최초 PR | 해결 시각 | 근거와 조치 및 상태 |
| --- | --- | --- | --- | --- | --- |
| 2026-11-17-producer-dashboard-pr-review-F01 | P2·FLOW·INTRODUCED | EXTERNAL | 2026-11-17T15:08:43+09:00 / #599 | 2026-11-17T15:22:13+09:00 | 공연 응답이 없는 상태에서 검사 기준이 앞서 갔다. 응답 도착 시 유지된 기준으로 재검사하며 다음 회차를 검증했다. FIXED |
| 2026-11-17-producer-dashboard-pr-review-F02 | P3·FLOW·INTRODUCED | EXTERNAL | 2026-11-17T15:08:43+09:00 / #599 | 2026-11-17T15:22:13+09:00 | 인증 대기에서 미조회 목록이 비어 보였다. 인증 안내와 성공 후 빈 상태를 분리했다. FIXED |
| 2026-11-17-producer-dashboard-pr-review-F03 | P3·FLOW·EXISTING | EXTERNAL | 2026-11-17T15:08:43+09:00 / #599 | 2026-11-17T15:22:13+09:00 | 접수 공고의 긴 제목에 말줄임이 적용됐다. 폭에 맞춰 줄바꿈하고 두 화면 크기에서 확인했다. FIXED |
| 2026-11-17-producer-dashboard-pr-review-F04 | P3·FLOW·EXISTING | EXTERNAL | 2026-11-17T15:08:43+09:00 / #599 | 2026-11-17T15:22:13+09:00 | 하위 경로에서 시각 강조만 제공했다. 상위 링크의 현재 위치 속성을 추가하고 정확 일치 동작을 확인했다. FIXED |
| 2026-11-17-producer-dashboard-pr-review-F05 | P3·FLOW·INTRODUCED | INDEPENDENT_REVIEW | 2026-11-17T15:19:53+09:00 / #599 | 2026-11-17T15:22:13+09:00 | 포커스 이동 없이 늦은 응답이 반복되면 렌더 시각이 예전 값을 유지했다. 새 응답을 확인할 때 표시 시각도 갱신한다. 재현 테스트 실패를 확인한 뒤 수정했다. FIXED |

| 사건 ID | 문제 ID | 사건 종류 | 발생 시각 | 근거·관련 PR |
| --- | --- | --- | --- | --- |
| E01 | 2026-11-17-producer-dashboard-pr-review-F01 | CONFIRMED | 2026-11-17T15:08:43+09:00 | [응답 지연 리뷰](https://github.com/woowacourse-teams/2026-yesulin/pull/599#discussion_r4595998579) |
| E02 | 2026-11-17-producer-dashboard-pr-review-F02 | CONFIRMED | 2026-11-17T15:08:43+09:00 | [인증 대기 리뷰](https://github.com/woowacourse-teams/2026-yesulin/pull/599#discussion_r4595998585) |
| E03 | 2026-11-17-producer-dashboard-pr-review-F03 | CONFIRMED | 2026-11-17T15:08:43+09:00 | [공고 제목 리뷰](https://github.com/woowacourse-teams/2026-yesulin/pull/599#discussion_r4595998569) |
| E04 | 2026-11-17-producer-dashboard-pr-review-F04 | CONFIRMED | 2026-11-17T15:08:43+09:00 | [현재 위치 리뷰](https://github.com/woowacourse-teams/2026-yesulin/pull/599#discussion_r4595998592) |
| E05 | 2026-11-17-producer-dashboard-pr-review-F05 | CONFIRMED | 2026-11-17T15:19:53+09:00 | 포커스 없는 지연 응답 회귀 테스트 실패, #599 |
| E06 | 2026-11-17-producer-dashboard-pr-review-F01 | FIXED | 2026-11-17T15:22:13+09:00 | 다음 회차가 나타나는 회귀 테스트 통과, #599 |
| E07 | 2026-11-17-producer-dashboard-pr-review-F02 | FIXED | 2026-11-17T15:22:13+09:00 | 인증 전후 목록 상태 테스트 통과, #599 |
| E08 | 2026-11-17-producer-dashboard-pr-review-F03 | FIXED | 2026-11-17T15:22:13+09:00 | 긴 제목 테스트 통과 및 좁은 폭 재검증, #599 |
| E09 | 2026-11-17-producer-dashboard-pr-review-F04 | FIXED | 2026-11-17T15:22:13+09:00 | 메뉴 접근성 속성 테스트 통과, #599 |
| E10 | 2026-11-17-producer-dashboard-pr-review-F05 | FIXED | 2026-11-17T15:22:13+09:00 | 동일 응답이 반복될 때 두 번만 조회하고 지난 회차를 숨기는 테스트 통과, #599 |

필수 PASS 5 / FAIL 0 / UNVERIFIED 0 / N/A 0. 발견 5 / 해결 5 / 미해결 0. P0 0 / P1 0 / P2 1 / P3 4. 미확인 0. 오탐 0. 발견 경로 PRECHECK 0 / INDEPENDENT_REVIEW 1 / POST_FIX_CHECK 0 / EXTERNAL 4.

브라우저는 루프백 테스트 응답으로 검증했다. 실기기와 실제 화면 낭독기 음성은 실행 범위 밖이다.
