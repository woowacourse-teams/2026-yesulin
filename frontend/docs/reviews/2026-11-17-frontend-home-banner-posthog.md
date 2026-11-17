# 홈 고정 배너 클릭의 PostHog 집계

- 작업 ID `2026-11-17-frontend-home-banner-posthog`
- 평가일 2026-11-17 (+09:00), frontend 평가표 v1
- 대상은 홈 오디션 알림과 공연 제작팀 모집의 카카오톡 링크 클릭이다. [분석 계약](../analytics.md), [PostHog 운영 안내](../posthog-setup.md), [홈 구조](../architecture.md)를 기준으로 검증했다.

| ID | 흐름 | 실패 조건 | 기대 결과 | 검증 방법 | 필수 |
| --- | --- | --- | --- | --- | --- |
| K01 | 브라우저 수집 지점 | 노출·전환·다른 버튼에서 이벤트가 발생하거나 클릭이 두 번 기록됨 | 각 홈 고정 배너의 링크 활성화당 배너 ID를 붙인 클릭 하나 | DOM 실제 클릭과 배너 선택의 이벤트 호출 검증 | 예 |
| K02 | 분석 경계와 집계 | 배너 간 혼합, 개발·내부·테스트 혼입, 동의 거부 또는 URL·개인정보 전송 | 선택 기간 배너별 고유 사용자와 총 클릭, 공통 필터와 허용 속성만 사용 | SDK 경계 테스트 및 운영·개발 대시보드 dry-run | 예 |
| K03 | 링크와 변경 범위 | 기존 오디션 GA, 캐러셀 또는 카카오톡 목적지 회귀, 불필요한 관리자/API 변경 | 두 링크의 이동 및 기존 계약, 집계 정의 및 정본만 추가 | 최종 Chromium, 전체 테스트·린트·빌드, Git 및 독립 평가 | 예 |
| K04 | 운영 수신 | 실제 PostHog의 새 이벤트 수신 및 새 표 게시 미확인 | 배포 및 대시보드 적용 뒤 운영 확인 | 실제 프로젝트 | 아니오 |

| ID | 결과 | 검증 근거 |
| --- | --- | --- |
| K01 | PASS | jsdom에서 초기 렌더와 배너 선택만으로는 전송되지 않았다. 오디션 클릭은 `banner_id=audition-alert`, 제작팀 반복 클릭은 `banner_id=producer-partnership`로 각각 전송한다. 가운데 버튼으로 새 탭을 열 때도 기록하고 오른쪽 버튼은 집계하지 않는다. 오디션의 기존 GA 호출은 1회다. |
| K02 | PASS | `home_banner_clicked`에 대해 운영/개발 호스트 조건, 분석 거부, 내부 브라우저 표시, 허용 배너 ID와 URL·이메일 제거를 확인했다. 운영 및 개발 dry-run에서 `uniqExact(person_id)`와 `count()`를 배너별로 구분하고 `environment`, `internal=false`, `test_object=false` 및 기간 필터를 포함했다. 비로그인은 브라우저 기준이다. |
| K03 | PASS | 최종 빌드의 Chromium 1280·761·390·320px에서 이미지, 이벤트 빈 상태·503 후 정상 재조회, 카카오톡 목적지와 키보드 동작을 확인했다. 카카오톡 응답은 로컬에서 대체했다. 전체 프런트엔드 1178개 테스트, 린트, Webpack 빌드와 `git diff --check`를 통과했다. 관리자 화면, API, DB는 변경하지 않았다. |
| K04 | UNVERIFIED | 운영 프로젝트에 실제로 전송하거나 대시보드 설정을 게시하지 않았다. 배포 후 PostHog Trends에서 새 이벤트로 볼 수 있으며, 저장된 집계 표는 운영 안내의 스크립트를 적용해야 표시된다. |

독립 평가 1회. 필수 PASS 3 / FAIL 0 / UNVERIFIED 0 / N/A 0. 전체 미확인 1건 (선택 K04). 신규 확정 문제 발견 3 / 해결 3 / 미해결 0. P0 0 · P1 0 · P2 0 · P3 3. PRECHECK 2 · INDEPENDENT_REVIEW 1 · POST_FIX_CHECK 0 · EXTERNAL 0. 오탐 0. 독립 평가에서 수정 후 관련 테스트 29개를 다시 실행했다. Claude CLI를 사용할 수 없어 별도 에이전트로 평가했다.

| 문제 ID | 심각도 / 유형 / 유입 | 발견 경로 및 최초 확정 | 근거 및 조치 | 상태 및 해결 시각 | 최초 PR |
| --- | --- | --- | --- | --- | --- |
| 2026-11-17-frontend-home-banner-posthog-F01 | P3 / FLOW / INTRODUCED | PRECHECK · 2026-11-17T11:19:30+09:00 | 개발 대시보드 반환 목록에 새 표가 빠졌다. 같은 정의를 운영과 개발의 반환 항목에 추가해 두 환경 dry-run을 확인했다. | FIXED · 2026-11-17T11:20:58+09:00 | [#596](https://github.com/woowacourse-teams/2026-yesulin/pull/596) |
| 2026-11-17-frontend-home-banner-posthog-F02 | P3 / TEST / INTRODUCED | PRECHECK · 2026-11-17T11:19:30+09:00 | jsdom에서 Sentry 번들러 의존성이 파일 URL을 요구해 테스트 초기화에 실패했다. 기존 테스트 패턴으로 Sentry를 대체했다. | FIXED · 2026-11-17T11:20:58+09:00 | [#596](https://github.com/woowacourse-teams/2026-yesulin/pull/596) |
| 2026-11-17-frontend-home-banner-posthog-F03 | P3 / FLOW / INTRODUCED | INDEPENDENT_REVIEW · 2026-11-17T11:25:35+09:00 | 가운데 버튼으로 새 탭을 열면 `click` 대신 `auxclick`이 발생한다. 가운데 버튼만 허용하는 핸들러로 연결하고 기존 GA는 주 이벤트에 유지했다. 주·가운데·오른쪽 버튼의 기록 범위를 비교했다. | FIXED · 2026-11-17T11:26:43+09:00 | [#596](https://github.com/woowacourse-teams/2026-yesulin/pull/596) |

| 사건 ID | 문제 ID 접미사 | 종류 | 시각 (+09:00) | 근거 / 관련 PR |
| --- | --- | --- | --- | --- |
| E01 | F01 | CONFIRMED | 2026-11-17T11:19:30+09:00 | 개발 dry-run에서 새 차트 탐색 실패 / [#596](https://github.com/woowacourse-teams/2026-yesulin/pull/596) |
| E02 | F02 | CONFIRMED | 2026-11-17T11:19:30+09:00 | Vitest DOM 테스트 초기화 오류 / [#596](https://github.com/woowacourse-teams/2026-yesulin/pull/596) |
| E03 | F01 | FIXED | 2026-11-17T11:20:58+09:00 | 운영 및 개발에서 배너별 집계 쿼리 확인 / [#596](https://github.com/woowacourse-teams/2026-yesulin/pull/596) |
| E04 | F02 | FIXED | 2026-11-17T11:20:58+09:00 | 테스트 62개 통과 / [#596](https://github.com/woowacourse-teams/2026-yesulin/pull/596) |
| E05 | F03 | CONFIRMED | 2026-11-17T11:25:35+09:00 | 독립 평가에서 가운데 버튼 링크 활성화 누락 확인 / [#596](https://github.com/woowacourse-teams/2026-yesulin/pull/596) |
| E06 | F03 | FIXED | 2026-11-17T11:26:43+09:00 | 가운데 버튼 수집·오른쪽 제외·GA 기존 범위 테스트 및 전체 테스트 통과 / [#596](https://github.com/woowacourse-teams/2026-yesulin/pull/596) |
