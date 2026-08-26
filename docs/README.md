# 문서 라우터

모든 문서를 미리 읽지 않는다. `README.md`와 작업 영역의 `AGENTS.md`를 확인한 뒤 아래 표에서 필요한 문서만 읽는다.

## 정본

| 작업 | 읽을 문서 |
| --- | --- |
| 공통 도메인·상태·권한 | [domain.md](./domain.md) |
| 용어와 ID 의미 | [glossary.md](./glossary.md) |
| HTTP 공통 규칙 | [api-conventions.md](./api-conventions.md) |
| 실제 백엔드 API | [backend/docs/api.md](../backend/docs/api.md) |
| 프론트 구조 | [frontend/docs/architecture.md](../frontend/docs/architecture.md) |
| 프론트 API·MSW | [frontend/docs/api-integration.md](../frontend/docs/api-integration.md) |
| UI·접근성 | [frontend/docs/design-system.md](../frontend/docs/design-system.md) |
| MSW 시나리오 | [frontend/docs/msw-scenarios.md](../frontend/docs/msw-scenarios.md) |
| 백엔드 구조·코드 규칙 | [backend/docs/architecture.md](../backend/docs/architecture.md) |
| 파일 저장 | [backend/docs/storage.md](../backend/docs/storage.md) |
| Git·Issue·PR | [git-workflow.md](./git-workflow.md) |

## 기본 읽기에서 제외

- [미구현](./implementation-gaps.md): 구현 범위를 계획하거나 완료 여부를 바꿀 때만 읽는다.
- [미결정](./pending-decisions.md): 사용자의 정책 결정이 필요한 작업에서만 읽는다.
- [출시 전 공개 정책](./policies/public/README.md): 개인정보·약관·정식 출시 준비 작업에서만 읽는다.
- `docs/policies/internal/`: Git에서 제외된 내부 출시 준비 자료다. 일반 개발 작업에서는 읽지 않는다.
- 과거 결정 기록은 현재 정본이 아니다. 현재 규칙은 위 정본과 코드를 따른다.

## 문서 원칙

1. 현재 동작은 코드와 테스트를 우선해 확인한다.
2. 확정된 제품 규칙은 `docs/`, 프론트 구현은 `frontend/docs/`, 백엔드 구현과 API는 `backend/docs/`가 책임진다.
3. 미구현·미결정·출시 전 개인정보 정책을 현재 정본에 섞지 않는다.
4. 같은 사실은 한 문서에서만 설명하고 다른 문서는 링크한다.
5. 구현이나 계약이 바뀌면 해당 영역 정본을 같은 작업에서 갱신한다.
