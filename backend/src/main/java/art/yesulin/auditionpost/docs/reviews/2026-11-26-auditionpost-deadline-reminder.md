# 오픈채팅 마감 안내 구현 평가

- 작업 ID `2026-11-26-auditionpost-deadline-reminder`, 평가표 v1, 2026-11-26
- 기준은 [마감 안내 설계](2026-11-26-auditionpost-deadline-reminder-design.md), [공고 상세 흐름](../flows/public-detail-original-view.md), [방문 분석](../../../../../../../../../frontend/docs/analytics.md)이다.

| ID | 흐름·실패 조건 | 기대 결과 | 검증 방법 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| R01 | 날짜 경계·페이지 누락·부분 실패 | 한국 날짜 기준 오늘·내일 공개 공고만 조회하고 이후 날짜·상시를 제외한다. 오류는 재시도할 수 있다. | `admin-openchat-reminder.test.tsx`의 자정·다중 페이지·오류 재시도, 공개 목록 MSW 정렬 테스트 | 예 | PASS |
| R02 | 관리자·공고 선택·편집 보호 | 관리자 인증 뒤 문구를 생성하고 편집·복사한다. 선택 변경과 자정 전환에서 작성한 문구를 보호한다. | 관리자 거부·복사·새로고침 테스트, 로컬 브라우저에서 데스크톱 문구 복사 호출과 390px 오늘 전환·편집 유지 확인. 로컬 API와 기록용 클립보드를 사용했다. | 예 | PASS |
| R03 | 리마인드ㆍ일반 방문 혼입 | 정상 공개 상세에만 검증된 캠페인을 연결한다. 주소 정리·중복 effect·이후 탐색·분석 거부를 처리한다. | `product-analytics.test.ts`의 전송 경계 모의, `openchat-visit.test.ts`의 주소 정리. 로컬 실제 상세에서 태그를 제거하고 다른 쿼리와 fragment를 보존하는 것을 확인했다. | 예 | PASS |
| R04 | 캠페인 전체 수를 공고별 수의 합으로 계산 | `person_id` 고유 수와 기존 운영 제외 조건을 사용하며 두 표를 제공한다. | 정의 dry-run 및 운영 PostHog의 두 HogQL 쿼리 실행 성공. 두 표를 [01 예술in 한눈에 보기](https://us.posthog.com/project/695875/dashboard/2275484)에 추가하고 대시보드 하단에 표시되는 것을 확인했다. 게시 직전 쿼리에는 해당 캠페인 기록이 없었다. | 예 | PASS |
| R05 | 기존 공고 진입 회귀 | 자체 방문·일반 조회·첨부·원문 확인이 계속 동작한다. | `openchat-visit.test.ts`, `server.test.ts`, `product-analytics.test.ts`, `audition-post-detail.test.tsx`, 공고 상세 변경 범위 대조 | 예 | PASS |
| R06 | 운영 수집ㆍ카카오톡 인앱 환경 | 프론트 배포 후 실제 캠페인 이벤트를 두 표에서 확인한다. | 운영 쿼리 실행과 표 연결을 검증했다. 신규 프론트 운영 배포와 카카오톡 실기기 이벤트 수신은 미확인이다. | 예 | UNVERIFIED |
| R07 | 미사용 코드·파일·설정·의존성·깨진 링크 | 기능 진입과 문서 참조가 연결된다. | 독립 검토 및 `git diff --check`, 로컬 문서 링크, 대상 ESLint, TypeScript, 관련 Vitest 69개, `npm run build` 및 Webpack 빌드 | 예 | PASS |

독립 구현 평가 1회. 새로고침이 마감 공고 목록까지 갱신하도록 보완하고, 다시 받아 온 공개 목록과 선택·편집 상태를 대조하는 회귀 테스트를 추가했다. 별도 의존성이나 사용되지 않는 산출물은 발견하지 않았다.


최신 `dev`(`8103a334`) 기반의 PR 작업 폴더에서 대상 ESLint, Vitest 7개 파일의 71개 테스트, `npm run build`를 다시 통과했다.

| 문제 ID | 심각도 · 유형 · 유입 | 발견 경로 · 최초 PR | 근거와 조치 | 상태 · 재검증 |
| --- | --- | --- | --- | --- |
| 2026-11-26-auditionpost-deadline-reminder-F01 | P2 · FLOW · INTRODUCED | INDEPENDENT_REVIEW · [#636](https://github.com/woowacourse-teams/2026-yesulin/pull/636) | 관리자 새로고침이 기존 방문 표만 갱신했다. 문구 생성기에도 갱신 값을 전달하고 응답 전과 내려간 공고의 복사를 제한한다. | FIXED · 화면 새로고침 회귀 테스트 PASS |

| 사건 ID | 문제 ID | 사건 | 기록 시각 | 근거 · PR |
| --- | --- | --- | --- | --- |
| F01-E01 | 2026-11-26-auditionpost-deadline-reminder-F01 | CONFIRMED | 2026-11-26T11:27:28+09:00 | 독립 검토에서 확인한 문제를 기록 · [#636](https://github.com/woowacourse-teams/2026-yesulin/pull/636) |
| F01-E02 | 2026-11-26-auditionpost-deadline-reminder-F01 | FIXED | 2026-11-26T11:27:28+09:00 | `admin-openchat-reminder.test.tsx` 새로고침 검증 및 최종 69개 테스트 PASS 기록 · [#636](https://github.com/woowacourse-teams/2026-yesulin/pull/636) |

필수 PASS 6 / FAIL 0 / UNVERIFIED 1 / N/A 0. 발견 1 / 해결 1 / 미해결 0 / P0 0 / P1 0 / P2 1 / P3 0. PRECHECK 0 / INDEPENDENT_REVIEW 1 / POST_FIX_CHECK 0 / EXTERNAL 0. 오탐 0.
