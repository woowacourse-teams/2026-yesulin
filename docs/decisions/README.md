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
4. [0004 Push 전 통합 브랜치 rebase](./0004-rebase-before-push.md) — accepted · agent-required
5. [0005 온보딩 문서 통합](./0005-consolidate-onboarding.md) — accepted · agent-required
6. [0006 클라이언트가 읽기 쉬운 API 경로](./0006-client-readable-api-paths.md) — accepted · agent-required
7. [0007 도메인 설계 정본 반영](./0007-adopt-domain-design-source.md) — accepted · agent-required
8. [0008 지원서·프로필·배역 규칙](./0008-application-profile-and-role-rules.md) — accepted · agent-required
9. [0009 로컬 우선 서버 Draft 동기화](./0009-local-first-server-draft.md) — accepted · agent-required
10. [0010 Backend 첫 영속화 구조](./0010-backend-persistence-slice.md) — accepted · agent-required
11. [0011 활성 공연사와 mock seed 이관 경계](./0011-active-company-and-seed-boundaries.md) — accepted · agent-required
12. [0012 Frontend·MSW·Backend 단일 API 계약](./0012-frontend-msw-backend-contract.md) — accepted · agent-required
13. [0013 이슈와 프로젝트 보드 워크플로](./0013-issue-and-project-board-workflow.md) — accepted · agent-required
