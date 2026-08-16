# 결정 기록

프로젝트 공통 결정은 한 파일에 하나씩 기록한다.

## 규칙

- 파일명: `yyyyMMddHHmmss-kebab-case.md`. `date -u '+%Y%m%d%H%M%S'`로 UTC prefix를 만든다.
- 길이: 원칙적으로 250단어 이내. `계기`, `결정`, `이유`, `영향`만 남긴다.
- 상세 명세는 반복하지 않고 관련 문서에 링크한다.
- 중요한 결정은 `agent-required: true`로 표시한다.
- `agent-required` 기록은 `AGENTS.md`와 `CLAUDE.md`의 필독 경로에 연결한다.
- 결정이 대체되면 삭제하지 않고 `status: superseded`와 대체 문서 링크를 남긴다.

## 목록

- [API 버전과 리소스 경로](./20260810200549-api-version-and-resource-paths.md) — accepted · agent-required
- [Checkstyle과 Git hook](./20260810200549-checkstyle-and-git-hooks.md) — accepted · agent-required
- [문서와 에이전트 컨텍스트](./20260810202026-documentation-and-agent-context.md) — accepted · agent-required
- [Push 전 통합 브랜치 rebase](./20260810202026-rebase-before-push.md) — accepted · agent-required
- [온보딩 문서 통합](./20260810204631-consolidate-onboarding.md) — accepted · agent-required
- [클라이언트가 읽기 쉬운 API 경로](./20260811180244-client-readable-api-paths.md) — accepted · agent-required
- [도메인 설계 정본 반영](./20260811180244-adopt-domain-design-source.md) — accepted · agent-required
- [지원서·프로필·배역 규칙](./20260812134827-application-profile-and-role-rules.md) — accepted · agent-required
- [로컬 우선 서버 Draft 동기화](./20260812134827-local-first-server-draft.md) — accepted · agent-required
- [파일 업로드 경계](./20260816095657-file-upload-boundaries.md) — accepted · agent-required
- [Presigned upload 생명주기와 소유권](./20260816095658-presigned-upload-lifecycle.md) — accepted · agent-required
- [시각 기반 결정 파일명](./20260816095659-time-based-decision-filenames.md) — accepted · agent-required
