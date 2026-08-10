# 결정 기록

프로젝트 공통 결정은 한 파일에 하나씩 기록한다.

## 규칙

- 파일명: `NNNN-kebab-case.md`. 번호는 4자리 순번이며 재사용·재정렬하지 않는다.
- 길이: 250단어 이내. `계기`, `결정`, `이유`, `영향`만 남긴다.
- 상세 명세는 반복하지 않고 관련 문서에 링크한다.
- 중요한 결정은 `agent-required: true`로 표시한다.
- `agent-required` 기록은 `AGENTS.md`와 `CLAUDE.md`의 필독 경로에 연결한다.
- 결정이 대체되면 삭제하지 않고 `status: superseded`와 대체 문서 번호를 남긴다.

## 목록

1. [0001 API 버전과 리소스 경로](./0001-api-version-and-resource-paths.md) — accepted · agent-required
2. [0002 Checkstyle과 Git hook](./0002-checkstyle-and-git-hooks.md) — accepted · agent-required
3. [0003 문서와 에이전트 컨텍스트](./0003-documentation-and-agent-context.md) — accepted · agent-required
