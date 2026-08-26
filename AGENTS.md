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

- `docs/implementation-gaps.md`는 미구현 기능을 직접 다룰 때만 읽는다.
- `docs/pending-decisions.md`는 정책 결정이 필요한 작업에서만 읽고 답을 임의로 정하지 않는다.
- `docs/policies/public/`과 `docs/policies/internal/`은 개인정보·약관·출시 정책 작업에서만 읽는다.
- 과거 결정·archive는 현재 정본이 아니다. 배경 추적이 꼭 필요할 때만 찾는다.
- `evidence.md`는 사용자가 별도로 지시하지 않는 한 수정·삭제·이동·통합하지 않는다.

## 구현과 문서

- API 계약 변경은 백엔드 Controller·DTO·테스트, 프론트 타입·호출·MSW와 관련 정본을 함께 맞춘다.
- 사용자 흐름, 비즈니스 규칙, 권한·상태 전이, 환경 변수와 실행 명령이 바뀌면 해당 책임 문서 하나를 갱신한다.
- 내부 리팩터링과 순수 UI 문구·간격 변경에는 불필요한 문서 변경을 만들지 않는다.
- 현재 코드로 판단할 수 없는 정책은 `pending-decisions.md`로 보내고 정본에 넣지 않는다.

## Git

- 브랜치를 생성할 때 `codex/` 접두사를 붙이지 않고 `docs/...`, `feat/...`, `fix/...`처럼 작업 타입으로 바로 시작한다.
- 루트 `node_modules/`가 없으면 `npm install`로 Husky hook을 설치한다.
- `--no-verify`와 `HUSKY=0`으로 hook을 우회하지 않는다.
- push 전 현재 통합 브랜치를 fetch하고 그 위로 rebase한다.
- 커밋·PR·주석에 AI 도구 이름이나 공동 작성자 표기를 넣지 않는다.

`CLAUDE.md`는 이 문서를 불러오므로 같은 규칙이 적용된다.
