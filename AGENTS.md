# 저장소 작업 규칙

현재 구현 상태는 코드와 테스트를 가장 먼저 따른다. 제품 정책은 `docs/domain.md`, 실제 HTTP 계약은
`backend/docs/api.md`가 정본이다. 미구현·미결정·출시 전 정책을 구현된 규칙으로 확대 해석하지 않는다.

## 최소 문서 라우팅

모든 문서를 미리 읽지 않는다. 작업에 직접 필요한 행만 선택한다.

| 작업 | 읽을 문서 |
| --- | --- |
| 저장소 실행·전체 구조 | `README.md` |
| 프론트 코드 | `frontend/AGENTS.md`와 그 라우팅 결과 |
| 백엔드 코드 | `backend/AGENTS.md`와 그 라우팅 결과 |
| 공통 도메인 변경 | `docs/domain.md` |
| Git·Issue·PR | `docs/git-workflow.md` |
| 문서 구조 자체 | `docs/README.md` |
| 모든 작업의 평가·PR 기록 | `docs/agent-review.md` |

- `docs/implementation-gaps.md`는 미구현 기능을 직접 다룰 때만 읽는다.
- `docs/pending-decisions.md`는 정책 결정이 필요한 작업에서만 읽고 답을 임의로 정하지 않는다.
- `docs/policies/public/`과 `docs/policies/internal/`은 개인정보·약관·출시 정책 작업에서만 읽는다.
- 과거 결정·archive는 현재 정본이 아니다. 배경 추적이 꼭 필요할 때만 찾는다.
- `evidence.md`는 사용자가 별도로 지시하지 않는 한 수정·삭제·이동·통합하지 않는다.

## 구현과 문서

- 공고 조회·첨부 다운로드·예매·PDF·심사 흐름을 바꿀 때 `frontend/docs/analytics.md`의 이벤트 발생 지점과
  `frontend/scripts/posthog/dashboards.mjs`의 집계 기준도 함께 확인한다. 단계 삭제·자동 저장·API 교체 시
  이벤트를 새 성공 지점으로 옮기며, 단순 버튼 클릭을 처리 성공으로 기록하지 않는다. 운영/개발 분리,
  내부·테스트 제외, 분석 거부, 개인정보 미전송, 재시도·재조회 중복 여부를 관련 테스트로 검증한다.
  이벤트 의미나 분모를 바꾸면 기존 시계열과 섞지 않고 버전·시행 시점을 기록한다.
- 로컬 백엔드는 `local` 프로필과 `backend/src/main/resources/application-local.yml`을 사용한다.
  기능별 `application-*-local.yml`이나 별도 로컬 프로필을 추가하지 않는다. 기능의 로컬 설정은 기존 local YAML에,
  개인 키·접속 값은 Git 비추적 `config/server/local.env`에 둔다.

- API 계약 변경은 백엔드 Controller·DTO, 프론트 타입·호출·MSW와 관련 정본을 함께 맞춘다.
- 사용자 흐름, 비즈니스 규칙, 권한·상태 전이, 환경 변수와 실행 명령이 바뀌면 해당 책임 문서 하나를 갱신한다.
- 내부 리팩터링과 순수 UI 문구·간격 변경에는 불필요한 문서 변경을 만들지 않는다.
- 현재 코드로 판단할 수 없는 정책은 `pending-decisions.md`로 보내고 정본에 넣지 않는다.

## 도메인 규칙과 작업 평가 (필수)

- 규칙은 **최상위 공통 `AGENTS.md` → 대상 도메인의 `docs/README.md` → `docs/AGENTS.md`** 순서다.
  `docs/README.md`는 도메인 문서의 필수 입구이며 규칙·기능 흐름·정책·평가표로 연결한다.
  작업 영역의 도메인을 찾아 이 경로를 명시적으로 읽는다. 하위 규칙은 공통 의무를 완화하지 않는다.
- 도메인별 `AGENTS.md`·`CLAUDE.md`·`README.md`는 모두 `<domain>/docs/`에 둔다.
  `docs/CLAUDE.md`는 같은 폴더의 `@AGENTS.md`를 참조한다. 최상위와 backend/frontend 공통 진입 파일은 유지한다.
  docs 아래 AGENTS는 코드 패키지에 자동 적용되지 않으므로 이 공통 규칙에 따라 반드시 명시적으로 읽는다.
- 공통 문서의 도메인 라우터는 [문서 라우터](docs/README.md)다. 기능별 흐름은 `docs/flows/`,
  기술 문제·결정에 따른 정책은 `docs/policies/`에 둔다. 레이어 내부 README에 나누지 않는다.
- **매 작업마다** 도메인 흐름·정책으로 평가표를 만들고, 구현 후 독립 에이전트 평가 1회를 수행한다.
  Codex 작업은 Claude, Claude 작업은 Codex가 평가하며, 상대 도구가 없으면 같은 종류의 별도 에이전트를 사용한다.
  추가 검증 조건은 도메인에서 정의한다. 평가자의 재귀 평가 의무는 없다.
- 평가자는 흐름의 빈틈과 함께 작업 내역의 미사용 파일·코드·설정·의존성·옛 문서도 필수 점검한다.
- 평가 결과·발견 문제·수정 후 검증을 사용자에게 보여주고 **PR 본문에 반드시 기록**한다.
  문제 ID와 발견/해결/미해결·심각도·미확인 건수를 고정 형식으로 남겨 기간별 중복 제거 집계가 가능하게 한다.
  PR 없는 작업도 평가 기록을 남긴다. 세부 절차·판정·집계는 [공통 평가 규칙](docs/agent-review.md),
  PR 양식은 `.github/pull_request_template.md`를 따른다. 평가 미실시·미확인을 통과로 바꾸지 않는다.

## Git

- 브랜치를 생성할 때 `codex/` 접두사를 붙이지 않고 `docs/...`, `feat/...`, `fix/...`처럼 작업 타입으로 바로 시작한다.
- 루트 `node_modules/`가 없으면 `npm install`로 Husky hook을 설치한다.
- `--no-verify`와 `HUSKY=0`으로 hook을 우회하지 않는다.
- push 전 현재 통합 브랜치를 fetch하고 그 위로 rebase한다.
- 커밋·PR·주석에 AI 도구 이름이나 공동 작성자 표기를 넣지 않는다.

`CLAUDE.md`는 이 문서를 불러오므로 같은 규칙이 적용된다.
