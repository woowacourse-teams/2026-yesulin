# 배우 목록 검색

- 작업 ID `2026-11-12-actor-list-search` / 평가표 v1 / PR #580
- 공개 배우 목록 API에 `q` 검색어를 더하고 `/actors?q=` 검색창을 붙인다. 이름이나 아이디 일부로 공개 중이고 잠기지 않은 배우만 찾는다.

| ID | 경계·실패 조건 | 기대 결과 | 검증 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| S01 | 공백·앞의 `@`·빈 값·30자 초과 | 정규화하고 빈 값은 검색어 없음, 초과는 400 | `PublicActorPageServiceTest`·코드 | Y | PASS |
| S02 | 이름·아이디 일부, 대소문자 | 부분 일치로 찾음 | 통합 테스트·실제 SQL | Y | PASS |
| S03 | 비공개·잠금 페이지 | 검색에도 나오지 않음 | 쿼리 조건·통합 테스트 | Y | PASS |
| S04 | 검색어의 `%`·`_`·`!` | 문자 그대로 비교 | 통합 테스트·실제 SQL | Y | PASS |
| S05 | 페이지 이동·정렬 | recent 순서 유지, 총계는 검색 결과 기준 | 통합 테스트·실제 SQL | Y | PASS |
| S06 | 주소·페이지 링크·빈 결과·지우기·접근성 | 검색어가 주소와 링크에 남고 빈 결과에서 전체 목록으로 이동 | 코드·단위 테스트·브라우저 MSW | Y | PASS |
| S07 | 검색 결과 화면 | 색인 제외, 일반 목록 canonical 유지 | 코드·빌드 결과 응답 | Y | PASS |
| S08 | 문서 정합 | domain.md·api.md가 구현과 일치 | 코드 대조 | Y | PASS |
| S09 | 정리 | 미사용 코드·파일·깨진 링크 없음 | 독립 평가·참조 검색 | Y | PASS |

인증·쓰기·권한·API 응답 모양 변경은 N/A다. 연락처·생년월일 등 비공개 항목은 쿼리와 응답에 없다.

## 평가·검증 결과

- 2026-11-12 독립 평가 1회 완료. 같은 종류의 별도 읽기 전용 에이전트로 수행했다.
- 평가 직후 필수 PASS 7 / FAIL 2(S06, S09) / UNVERIFIED 0. 수정 후 표적 검증으로 두 항목이 PASS가 되어 최종 PASS 9 / FAIL 0 / UNVERIFIED 0 / N/A 0.
- 신규 확정 발견 3 / 해결 2 / 미해결 1. P0 0 / P1 0 / P2 1 / P3 2. 오탐 0. 발견 경로는 INDEPENDENT_REVIEW 3.
- `./gradlew test --tests 'art.yesulin.actor.*'` PASS(`PublicActorPageServiceTest` 11건, 검색 3건 포함), `npm run checkstyle` PASS.
- 프론트 `vitest src/features/actor-pages src/mocks/actor-page-handlers.test.ts` 67건 PASS, 변경 파일 eslint PASS, `npm run build` PASS. `tsc --noEmit`의 `original-screening.test.tsx` 오류 1건은 이번 변경과 무관한 기존 문제다.
- 브라우저 MSW: `/actors?q=김하` 1명, 검색어가 주소에 남음, `/actors?q=zzzz` 빈 결과를 데스크톱·375px에서 확인했다. 빌드 결과 응답에서 검색 결과 화면은 `noindex, follow`, 일반 목록은 canonical을 유지했다.
- 평가자가 SQL을 확인했다: 정렬 별칭이 페이지 엔티티에 붙고 count 쿼리가 같은 조건이며 프로필과 페이지는 1:1이라 행이 중복되지 않는다. 이름이 null이면 아이디 조건만으로 판단한다.
- 검색은 앞 와일드카드 `like`라 인덱스를 쓰지 못하고 상태 인덱스로 범위만 좁힌다. 공개 배우가 수천 명 이하인 현재 규모에서는 문제가 없고, 늘면 정규화 컬럼이나 전문 검색을 검토한다.
- 실제 백엔드와 프론트를 연결한 확인과 이름이 null인 프로필 케이스의 직접 테스트는 하지 않았다(로컬 DB 미기동, 공개 조건이 이름을 요구해 정상 상태에서는 발생하지 않는다).

## 문제 목록

| 문제 ID | 심각도·유형·유입 | 발견 경로 | 최초 확정(+09:00) / 최초 기록 PR | 해결 시각(+09:00) | 문제·근거 | 조치·상태·수정 후 검증 |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-11-12-actor-list-search-F01 | P2·FLOW·INTRODUCED | INDEPENDENT_REVIEW | 2026-11-12T17:02:00+09:00 / #580 | 2026-11-12T17:03:00+09:00 | 첫 페이지의 빈 검색 결과 "전체 배우 보기"가 같은 검색 주소로 되돌아갔다. | 경로 계산을 `emptyListRecovery`로 분리해 전체 목록으로 보냈다. FIXED, 단위 테스트 3건 추가 후 PASS. |
| 2026-11-12-actor-list-search-F02 | P3·UNUSED·INTRODUCED | INDEPENDENT_REVIEW | 2026-11-12T17:02:00+09:00 / #580 | 2026-11-12T17:03:00+09:00 | `ActorPageSearchCondition`의 1인자 보조 생성자를 테스트 한 곳만 썼고 불필요한 주석이 있었다. | 보조 생성자와 주석을 지우고 테스트를 2인자로 바꿨다. FIXED, actor 테스트·Checkstyle PASS. |
| 2026-11-12-actor-list-search-F03 | P3·TEST·INTRODUCED | INDEPENDENT_REVIEW | 2026-11-12T17:02:00+09:00 / #580 | - | 잠금 도메인이 상태를 비공개로 바꾸므로 잠금 테스트는 `lockedAt is null` 조건만 따로 검증하지 못한다. 공개이면서 잠긴 상태는 현재 경로로 만들 수 없다. | OPEN, 방어 조건으로 쿼리에 남기고 기능 위험은 없어 수용한다. |

## 상태 사건 이력(추가 전용)

| 사건 ID | 문제 ID | 종류 | 발생 시각(+09:00) | 근거·관련 PR |
| --- | --- | --- | --- | --- |
| E01 | 2026-11-12-actor-list-search-F01 | CONFIRMED | 2026-11-12T17:02:00+09:00 | 독립 평가, PR #580 |
| E02 | 2026-11-12-actor-list-search-F02 | CONFIRMED | 2026-11-12T17:02:00+09:00 | 독립 평가, PR #580 |
| E03 | 2026-11-12-actor-list-search-F03 | CONFIRMED | 2026-11-12T17:02:00+09:00 | 독립 평가, PR #580 |
| E04 | 2026-11-12-actor-list-search-F01 | FIXED | 2026-11-12T17:03:00+09:00 | `emptyListRecovery` 분리, vitest 67건 PASS |
| E05 | 2026-11-12-actor-list-search-F02 | FIXED | 2026-11-12T17:03:00+09:00 | 보조 생성자 삭제, actor 테스트 PASS |

## 최초 PR 게시 연결

- 2026-11-12T17:05:00+09:00: 이 작업 기록과 문제 ID·추가 전용 사건 이력을 최초 게시 PR [#580](https://github.com/woowacourse-teams/2026-yesulin/pull/580)에 연결했다. 위 사건 이력의 `PR PENDING`은 게시 전 당시 표기이며 최초 확정·해결 시각을 바꾸지 않는다. 이 기록 문제의 최초 기록 PR은 #580이다.
