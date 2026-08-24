# 문서 라우터

이 문서는 사람과 AI가 작업에 필요한 문서만 선택하도록 안내한다. 모든 문서를 미리 읽지 않는다. 현재 규칙은 정본 문서에서 확인하고, 상세 구현과 과거 결정은 관련 작업에서만 찾는다.

## 정본 인덱스

아래 문서는 현재 규칙의 정본이며 모든 작업에서 일괄로 읽지 않는다. 현재 작업과 관련된 정본만 선택한다.

- [프로젝트 README](../README.md): 제품 범위, 실행 방법과 코드 지도
- [도메인 설계](./domain-design.md): 확정된 비즈니스 규칙, 현재 구현 차이와 미결정 질문
- [API 컨벤션](./convention/api-convention.md): 목표 API와 프론트·백엔드 이관 상태
- [공개 정책](./policies/public/README.md): 이용자에게 공개할 약관·처리방침·동의문

`AGENTS.md`, 프로젝트 `README.md`, 이 라우터를 제외한 문서는 작업과 관련될 때만 읽는다.

## 작업별 문서

| 작업 | 함께 읽을 문서 |
| --- | --- |
| 프론트 실행·구조 | [프론트엔드 README](../frontend/README.md), [프론트 작업 규칙](../frontend/AGENTS.md) |
| UI·반응형·접근성 | [디자인 시스템](./development/frontend/design-system.md) |
| MSW fixture·시나리오·Visual QA | [MSW 시나리오](./development/frontend/mock-scenarios.md) |
| 배우 지원서·인증·Draft | [배우 흐름도](./development/flows/actor.mmd), [프론트 구현 상태](./development/frontend/current-implementation.md) |
| 공연·공고·심사 관리 | [기획사/제작사 흐름도](./development/flows/producer.mmd), [공고 관리](./development/backend/audition-management.md) |
| 파일 업로드·소유권 | [파일 업로드 설계](./development/backend/file-upload.md) |
| 소셜 로그인·OIDC | [소셜 로그인 연동 모듈](./development/backend/oauth-social-login.md), [로그인 담당자 인수인계](./development/backend/social-login-handoff.md) |
| 이슈·프로젝트 보드·Git·커밋·push | [Git 컨벤션](./convention/git-convention.md) |
| 백엔드 Java·Checkstyle | [백엔드 컨벤션](./convention/be-code-convention.md) |
| 결정 배경 추적 | [결정 기록](./decisions/README.md) |

[개발 상세 문서](./development/README.md)는 공개 GitHub에서 공유하되 기본 AI 컨텍스트에서는 제외되는 on-demand 자료다. 구현에 필요한 현재 계약·검증 기준만 두고, 논의 과정·과거 결정·운영 원장은 내부 Notion에서 관리한다. 실제 개인정보·비밀·자격증명은 Git에 기록하지 않는다.

## 문서 생명주기

- **정본**: 현재 제품 규칙과 계약이다. 구현 변경과 같은 작업에서 갱신한다.
- **Development / on-demand**: 공개 저장소에 유지할 구현·검증 자료다. 관련 작업에서만 읽는다.
- **Decision / on-demand**: 현재 설계의 이유다. 계약을 변경하거나 배경을 추적할 때 읽는다.
- **Internal / Archive**: 논의 과정과 정본에 흡수된 과거 기록이다. GitHub에 올리지 않고 접근 제한된 Notion에서 관리한다.

결정 결과는 도메인·API·컨벤션 정본에 반영하고 같은 사실을 README와 여러 결정 파일에 반복하지 않는다. 내부 리팩터링, 문구·간격 조정과 이미 정한 규칙의 단순 구현에는 새 결정 기록을 만들지 않는다.

## 변경 기준

사용자 흐름, 비즈니스 규칙, API 필드 의미, 권한·상태 전이·데이터 생명주기, MSW와 백엔드의 공유 계약, 환경 변수나 실행 명령이 바뀌면 관련 정본을 구현과 함께 갱신한다. 여러 영역에 영향을 주는 새 결정만 [결정 기록 규칙](./decisions/README.md)에 따라 짧게 남긴다.
