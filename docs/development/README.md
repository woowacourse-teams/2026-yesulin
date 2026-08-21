# 개발 상세 문서

이 경로는 코드·MSW·백엔드 계약을 구현하는 데 필요하지만 모든 작업의 기본 필독은 아닌 on-demand 자료를 모은다. 공개 GitHub에서 팀원과 AI가 같은 구현 기준을 사용해야 하므로 추적한다. 논의 과정·과거 결정·운영 원장·민감 정보는 이 경로에 두지 않고 내부 Notion에서 관리한다.

| 작업 | 필요한 문서 |
| --- | --- |
| 프론트 UI·스타일 | [디자인 시스템](./frontend/design-system.md) |
| MSW fixture·시나리오·Visual QA | [MSW 시나리오](./frontend/mock-scenarios.md) |
| 현재 프론트 프로토타입 동작 확인 | [프론트 구현 상태](./frontend/current-implementation.md) |
| 배우 지원 흐름 | [배우 흐름도](./flows/actor.mmd) |
| 기획사/제작사 관리 흐름 | [기획사/제작사 흐름도](./flows/producer.mmd) |
| 공고 Aggregate·저장 순서 | [공고 관리](./backend/audition-management.md) |
| 파일 소유권·업로드 생명주기 | [파일 업로드 설계](./backend/file-upload.md) |
| 소셜 로그인·OIDC 연동 | [소셜 로그인 연동 모듈](./backend/oauth-social-login.md), [로그인 담당자 인수인계](./backend/social-login-handoff.md) |

관련 작업이 아니면 이 문서들을 미리 읽지 않는다. 현재 규칙은 [도메인 설계](../domain-design.md)와 [API 컨벤션](../convention/api-convention.md)이 우선하며, 현재 설계의 이유가 필요할 때만 [결정 기록](../decisions/README.md)을 찾는다.
