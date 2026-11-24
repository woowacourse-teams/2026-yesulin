# 홈 분야 바로가기와 푸터 prefetch 제한

- 작업 ID `2026-11-24-frontend-home-prefetch`, 평가표 v1, 평가일 2026-11-24
- 기준 [프론트 구조](../architecture.md), [프론트 평가 규칙](../AGENTS.md), [공통 평가 절차](../../../docs/agent-review.md)
- 범위는 홈의 분야 바로가기 5개와 푸터의 소개·약관·개인정보처리방침 링크 3개다.

| ID | 흐름 | 실패 조건 | 기대 결과 | 검증 방법 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- | --- |
| L01 | 홈 렌더링, 뷰포트 진입과 호버 | 대상 URL이 클릭 전에 요청됨 | 대상 선행 요청 0건 | 프로덕션 브라우저 Resource Timing | 예 | PASS |
| L02 | 링크 활성화 | 다른 URL, 오류 화면 또는 본문 누락 | 대상 URL과 해당 본문 표시 | 데스크톱 클릭 8건, 키보드 1건, 모바일 터치 2건 | 예 | PASS |
| L03 | 다른 홈 링크와 공용 푸터 | 다른 링크의 선행 요청도 중단됨 | 홈 헤더·목록과 비홈 푸터의 기본 동작 유지 | 호출부 검색 및 브라우저 네트워크 대조 | 예 | PASS |
| L04 | 홈과 목록의 기존 흐름 | 빈 상태·오류 복구·과거 주소·동작 줄이기 회귀 | 기존 흐름 동작 | 관련 테스트, 503 후 재시도, 빈 페이지·리다이렉트·모바일 확인 | 예 | PASS |
| L05 | 빌드와 변경 범위 | 타입 오류 또는 미사용 코드·설정·의존성·문서 유입 | 변경분 검증 및 독립 평가 | ESLint, Vitest, Next 빌드, diff·참조 점검 | 예 | PASS |
| L06 | 실제 기기와 운영 집계 | 로컬 관측을 운영 절감량 또는 실기기 동작으로 해석 | 운영 요청 변화와 실기기 동작 확인 | 배포 후 동등한 기간 측정 및 실기기 확인 | 아니요 | UNVERIFIED |

## 검증 근거

- Next.js 16.2.12 `npm run build`를 MSW 환경 변수로 실행하고 로컬 standalone 서버를 사용했다. 변경 파일 ESLint와 관련 Vitest 4개 파일의 16개 테스트가 통과했다. 복수 잠금 파일 경고가 표시됐다.
- ego-browser에서 대상 링크 8개를 화면에 노출하고 각각 호버한 뒤 브라우저의 요청을 확인했다. 대상 URL 요청은 0건이었다. 같은 페이지에서 홈 헤더의 `/auditions` 등 다른 링크의 RSC 요청은 발생했다.
- 데스크톱에서 `/auditions/theater`, `/auditions/musical`, `/auditions/performance`, `/auditions/troupe`, `/auditions/agency`, `/about`, `/terms`, `/privacy`를 각각 클릭해 URL과 해당 페이지 제목 또는 제목 요소를 확인했다. `/auditions`에서 공용 푸터 3개 링크의 RSC 선행 요청도 확인했다.
- 연극 링크를 Enter와 390px 모바일 터치로 열고, 모바일에서 개인정보처리방침 링크도 터치로 열었다. 동작 줄이기가 켜진 모바일에서 분야 자동 재생 표시가 0건이었다. 연극 목록 요청에 로컬 503 응답을 한 번 주고 재시도 버튼으로 목록이 복구되는 것을 확인했다. `/?page=999&closed=1`은 `/auditions?closed=1&page=999`로 이동해 빈 페이지 안내를 표시했다.
- 분야 확인 기록과 분석 이벤트 발생 지점은 기존 코드 경로를 따른다. [이벤트 정의](../analytics.md)와 [PostHog 집계](../../scripts/posthog/dashboards.mjs)를 대조했다.

## 평가 결과

- 독립 평가 1회. Claude CLI가 PATH에 없어 별도 평가 에이전트가 홈·공용 컴포넌트의 호출 범위, Next.js `Link` 기본값, 네트워크 및 클릭 검증 근거를 점검했다.
- 필수 PASS 5 / FAIL 0 / UNVERIFIED 0 / N/A 0. 필수 검증률 100%(5/5). 선택 UNVERIFIED 1건은 실기기와 운영 절감량 확인이다.
- 신규 확정 문제 발견 0 / 해결 0 / 미해결 0 / P0 0 / P1 0 / P2 0 / P3 0. PRECHECK 0 / INDEPENDENT_REVIEW 0 / POST_FIX_CHECK 0 / EXTERNAL 0, 오탐 0, 미확인 1.
- 작업 범위의 미사용 파일·코드·설정·의존성·옛 문서와 깨진 링크는 확인되지 않았다.

## dev PR 준비와 배포 확인

- 작업 ID `2026-11-24-frontend-home-prefetch-dev-pr`, 평가표 v1, 평가일 2026-11-24
- `origin/dev`의 `9a815d96`을 기준으로 별도 worktree에서 prefetch 코드 4개 파일과 이 평가 기록을 준비했다. 당시 `main...dev`에는 각 브랜치 별도 커밋 118개와 16개가 있었고, 요청받은 통합 브랜치 `dev`를 기준으로 했다.

| ID | 흐름 | 실패 조건 | 기대 결과 | 검증 방법 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- | --- |
| R01 | PR 변경 범위 | 공용 레이아웃의 다른 작업이 섞임 | prefetch 변경과 평가 기록만 포함 | `origin/dev`와 diff·호출부 대조 | 예 | PASS |
| R02 | dev 기준 검증 | 최신 기준에서 빌드 또는 링크 동작 회귀 | 빌드와 클릭, 범위 검증 통과 | lint, 테스트, 로컬 프로덕션 브라우저 확인 | 예 | PASS |
| R03 | Dev 도메인과 배포 | 다른 프로젝트이거나 배포가 준비되지 않음 | 같은 프로젝트의 dev Preview 응답 확인 | Vercel 도메인·배포 상세와 실제 홈 응답 대조 | 예 | PASS |
| R04 | 작업 기록 연결 | 이슈가 없거나 작업 상태가 누락됨 | 담당자와 프로젝트 상태 반영 | GitHub 이슈와 프로젝트 Status 확인 | 예 | PASS |

- 변경 파일 ESLint, 관련 Vitest 4개 파일의 18개 테스트, 로컬 프로덕션 빌드(MSW)를 통과했다. 브라우저에서 대상 링크의 클릭 전 요청 0건과 홈 기본 목록 링크의 RSC 요청 2건을 확인했다. 8개 링크의 클릭 이동과 오디션 목록 화면 푸터의 3개 기본 prefetch도 확인했다.
- Vercel `yesul-in/yesulin-frontend`에 `yesulin.art`는 Production, `dev.yesulin.art`는 `dev`로 연결돼 있다. `dev`의 `9a815d9` Preview가 Ready였고 개발 홈은 HTTP 200이었다. [Vercel 도메인](https://vercel.com/yesul-in/yesulin-frontend/settings/domains) · [Dev Preview](https://vercel.com/yesul-in/yesulin-frontend/75omhbrC61vbkFMhgJGqeQJD6EUJ)
- [이슈 #634](https://github.com/woowacourse-teams/2026-yesulin/issues/634)를 등록하고 프로젝트 #131에서 In Progress 상태를 확인했다.
- 독립 평가 1회. 필수 PASS 4 / FAIL 0 / UNVERIFIED 0 / N/A 0. 신규 확정 문제 발견 0 / 해결 0 / 미해결 0 / P0 0 / P1 0 / P2 0 / P3 0. PRECHECK 0 / INDEPENDENT_REVIEW 0 / POST_FIX_CHECK 0 / EXTERNAL 0, 오탐 0, 미확인 0. 변경 범위에서 미사용 항목과 깨진 링크가 확인되지 않았다.

## dev 최신화

- 작업 ID `2026-11-24-frontend-home-prefetch-rebase`, 평가표 v1, 평가일 2026-11-24
- [PR #635](https://github.com/woowacourse-teams/2026-yesulin/pull/635)가 [#633](https://github.com/woowacourse-teams/2026-yesulin/pull/633)의 병합으로 1커밋 뒤처졌다. PR의 기존 원격 머리 `ac0469f1`과 작업 디렉터리의 일치를 확인한 뒤 최신 `dev` `1484a2a0` 위로 리베이스했다.

| ID | 흐름 | 실패 조건 | 기대 결과 | 검증 방법 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- | --- |
| B01 | 대상 브랜치 확인 | 다른 PR이나 추가 로컬 변경으로 리베이스 | #635의 원격 머리와 깨끗한 worktree 일치 | GitHub PR 상태, fetch 후 커밋 및 status 대조 | 예 | PASS |
| B02 | 변경 재적용 | 충돌 또는 PR 코드 유실 | 최신 dev 위 단일 커밋과 기존 코드 변경 보존 | rebase, range-diff, 앱 소스 4개 파일 비교 | 예 | PASS |
| B03 | 회귀 검증 | 새 기준의 빌드 실패 또는 관련 테스트 회귀 | 변경 파일 lint, 관련 테스트 및 프로덕션 빌드 통과 | ESLint, Vitest, 로컬 프로덕션 빌드(MSW) | 예 | PASS |

- 리베이스는 충돌 없이 끝났다. 평가 기록을 추가하기 전 `range-diff`에서 변경이 동일했고, 앱 파일 4개는 기존 PR 머리와 일치했다. 관련 Vitest 6개 파일 46개, lint, 빌드가 통과했다.
- 독립 평가 1회. 필수 PASS 3 / FAIL 0 / UNVERIFIED 0 / N/A 0. 신규 확정 문제 발견 0 / 해결 0 / 미해결 0 및 P0 0 / P1 0 / P2 0 / P3 0. PRECHECK 0 / INDEPENDENT_REVIEW 0 / POST_FIX_CHECK 0 / EXTERNAL 0, 오탐 0, 미확인 0. 변경 범위에서 미사용 항목과 깨진 링크가 확인되지 않았다.
