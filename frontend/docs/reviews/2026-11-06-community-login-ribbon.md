# 비로그인 커뮤니티 로그인 띠 평가

- 작업 ID: `2026-11-06-community-login-ribbon`
- 사용자 선택: 3번 상단 띠, 비로그인에게만 노출. 부가 설명 없이 `1초 로그인`과 소셜3개 버튼.
- 기준: 루트/프론트 규칙, community/docs/README → AGENTS, 로그인 참여 요구사항, auth/docs/README → AGENTS. 실제 소셜 인증·복귀 계약 재사용.
- 사전 평가표 v1. 구현 전 작성. PR #559.
- 후속 사용자 요청: 로그인 화면의 설명·이용 목적·계정별 부연·자동 생성 안내 제거. 계정 선택 접근 가능한 이름과 기존 제작사·지원서 인증 흐름은 유지한다.
- 독립 평가 1회 완료. 상대 CLI 인증이 준비되지 않아 별도 Codex 에이전트를 사용했다. 읽기 전용 검토 및 관련34개 테스트 독립 재실행. 신규 확정 결함 없음.
- 판정: 구현 및 로컬 목 검증 완료, 실OAuth 왕복·모바일 실기기·키보드 실브라우저는 조건부 미확인. PR·배포 없음.

| ID | 흐름 / 실패 조건 | 기대 결과 | 검증 방법 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| R01 | 비로그인·세션 대기·로그인 전환 | 비로그인 확정 시만 띠, 로그인 이후 숨김 | DOM 테스트 및 실제 로컬 비로그인→목 로그인→목록 복귀에서 숨김 확인 | 예 | PASS |
| R02 | 소셜 선택·중복 클릭 | 바로 OAuth, 내부 복귀 주소 저장, 중복 차단 | 실제 모드3개 provider 및 목+실제 소셜 flag 테스트, 외부returnTo 거부. 브라우저 외부 OAuth 인증 자체는 실행하지 않음 | 예 | PASS |
| R03 | 목 로그인·실패/재시도 | 실제 API 설정 분리, 성공 후 글쓰기, 실패 상태 복구 | DOM 중복 클릭·이동 throw 후 재시도 통과. 브라우저 카카오 목 버튼 → /community/new 편집기·익명 선택 상태 확인 | 예 | PASS |
| R04 | 기존 로그인 페이지·제작사 | 기존 역할 선택·소셜 복귀·모의 세션 유지 | producer-entry/signup·social-login-return-to·로그인 페이지 기존 테스트. 브라우저 로그인 제목·2계정 선택·3소셜만 표시 및 제작사 선택 후 이메일/비밀번호 표시 | 예 | PASS |
| R05 | 문구·PC/모바일·키보드 | 1초 로그인만,3개 접근 가능한 버튼, 넘침 없음 | 실제 PC 띠와 간소화 로그인 시각 확인·accessible radio 이름 확인. 모바일·실기기 키보드 실행은 미확인 | 예 | UNVERIFIED |
| R06 | 분석·작성 권한·기존 피드 | 버튼을 로그인/작성 성공으로 세지 않음, 기존 정책 유지 | events.test 및 새 테스트: OAuth시 attempt만, 목 로그인 성공 후 success. 피드/작성 API·community 이벤트 호출 변경 없음 | 예 | PASS |
| R07 | 미사용 코드·자산·설정·의존성·문서 | 중복 소셜 처리 제거, 참조 연결 | 독립 평가: LoginForm 옛 소셜 핸들러·provider labels 제거, SocialLogin을2곳에서 사용. RoleField 미사용purpose/description 제거, 추가 의존성 없음 | 예 | PASS |
| R08 | 서버 API·DB·메일 복구 | 이번 변경 없음 | diff | 아니오 | N/A |

필수 PASS6 / FAIL0 / UNVERIFIED1 / N/A1. 검증률85.7%(6/7).
신규 확정 문제 발견0 / 해결0 / 미해결0 / P0 0 / P1 0 / P2 0 / P3 0.
PRECHECK0 / INDEPENDENT_REVIEW0 / POST_FIX_CHECK0 / EXTERNAL0, 오탐0, 미확인1. 새 문제·상태 변경 사건이 없어 문제 이력 행은 없다.

## 검증 근거

- `npm run lint`: 전체 통과.
- `npm test -- src/components/community/community-login-ribbon.test.tsx src/components/auth/producer-entry.test.tsx src/features/auth/social-login-return-to.test.ts src/features/analytics/events.test.ts src/app/\(auth\)/login/page.test.tsx`: 5파일34테스트 통과, 평가자 재실행 동일.
- 작업 폴더 전체 빌드는 이전 점검에서 확인한 기존 미추적 `design-preview/page.tsx`의 initialPage 타입 오류가 있어 통과로 주장하지 않는다. 기존 실험 파일을 건드리지 않고 추적 frontend+이번 신규 파일을 `/private/tmp/yesulin-home-pagination-build`에 복사해 `npm run build -- --webpack` 실행: 타입 검사 및62페이지 빌드 통과.
- 브라우저는 명시적 MSW 환경. 커뮤니티 guest→목카카오 로그인→글쓰기→로그인한 목록 숨김→로그아웃→로그인 화면→제작사 radio 선택을 확인했다. 실제 인증/운영 데이터/공고 등록은 하지 않았다.

## PR 최초 게시

- 최초 기록 PR: [#559](https://github.com/woowacourse-teams/2026-yesulin/pull/559), 대상 dev.
- 위의 PR 미게시·커밋/배포 없음 문구는 최초 점검 시점의 기록이며, 게시 후에도 과거 검증 결과와 상태 사건은 보존한다.
- 게시 전 독립 일관성 검토에서 문제 ID 중복 제거 발견3/해결3/P2 3,4개 작업별 평가와20파일 범위 일치를 확인했다.
- 병합 직전 최신 dev 기준 rebase 확인 및 관련8파일50테스트 통과. 실제 인증/모바일 미확인 범위는 그대로 유지한다.

## 사용자 요청에 따른 후속 원복

- 2026-11-06 사용자가 dev 확인 후 커뮤니티·로그인 변경을 취소했다. 구현·평가 당시 결과는 보존하고 현재 정책·화면의 정본으로 쓰지 않는다.
- 원복은 기능 결함 신규 발견으로 집계하지 않는다. 홈 포스터 수정은 유지한다.
- 원복 근거와 검증: [선택적 원복 평가](2026-11-06-community-login-rollback.md), 이슈 #561. main PR #560은 원복 반영 전 초안 상태로 유지한다.
