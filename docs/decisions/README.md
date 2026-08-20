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
- [공연 추가와 포스터 참조 확정](./20260816102630-performance-creation.md) — accepted · agent-required
- [공연 수정과 포스터 변경 이벤트](./20260816103139-performance-update.md) — accepted · agent-required
- [파일 업로드 상태와 도메인 참조 분리](./20260817063526-file-reference-registry.md) — accepted · agent-required
- [CI 런타임과 병렬 Job](./20260818092422-ci-runtime-and-parallel-jobs.md) — accepted · agent-required
- [프론트 이중 검증과 GitHub 보안 기준](./20260818105845-frontend-preview-and-github-security.md) — accepted · agent-required
- [백엔드 JAR와 systemd 배포](./20260819021010-backend-jar-systemd-deployment.md) — accepted · agent-required
- [백엔드 EC2 운영체제](./20260819061141-backend-ec2-operating-system.md) — accepted · agent-required
- [공고 생명주기와 섹션 Aggregate](./20260819073112-audition-section-aggregates.md) — accepted · agent-required
- [인증 주체별 로그인·가입 흐름](./0010-role-specific-auth-flow.md) — accepted · agent-required
- [배우와 기획사/제작사 용어 사용](./0011-actor-and-company-terminology.md) — accepted · agent-required
- [배우 프로필 보관함](./0012-applicant-profile-library.md) — accepted · agent-required
- [내 지원서와 전형 공개](./0013-application-history-and-progress.md) — accepted · agent-required
- [공연·공고 생성과 수정 경계](./0014-performance-posting-management.md) — accepted · agent-required
- [공고 콘텐츠 제한과 작성 중 상태](./0015-posting-content-limits-and-draft-status.md) — accepted · agent-required
- [심사 상세 식별과 화면 경로](./0016-screening-detail-identity-and-route.md) — accepted · agent-required
- [공고 이미지와 연습 장소](./0017-posting-images-and-rehearsal-location.md) — accepted · agent-required
- [관리자 배역별 지원 현황 진입 통일](./0018-always-show-admin-role-picker.md) — accepted · agent-required
- [공고 영상 요구사항 상한 5개](./0019-limit-posting-video-requirements-to-five.md) — accepted · agent-required
- [공고명 수정 허용](./0020-allow-posting-title-edit.md) — accepted · agent-required
- [심사 완료 결과 필터와 차수별 일괄 작업](./0021-review-result-filter-and-round-actions.md) — accepted · agent-required
- [style 커밋 타입 허용](./0022-allow-style-commit-type.md) — accepted · agent-required
