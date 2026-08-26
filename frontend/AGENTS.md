# 프론트엔드 작업 규칙

루트 `AGENTS.md`와 함께 적용한다. 모든 프론트 문서를 미리 읽지 않는다.

## 작업별 문서

| 작업 | 추가로 읽을 문서 |
| --- | --- |
| 구조·상태 경계 | [architecture.md](./docs/architecture.md) |
| API 타입·호출·MSW | [api-integration.md](./docs/api-integration.md), 필요하면 [백엔드 API](../backend/docs/api.md) |
| UI·반응형·접근성 | [design-system.md](./docs/design-system.md) |
| GTM·분석 동의·이벤트 | [analytics.md](./docs/analytics.md) |
| 목 fixture·시나리오 | [msw-scenarios.md](./docs/msw-scenarios.md) |
| 배우 흐름 | [applicant.mmd](./docs/user-flows/applicant.mmd) |
| 기획사/제작사 흐름 | [producer.mmd](./docs/user-flows/producer.mmd) |
| 배포 | [deployment.md](./docs/deployment.md) |

공통 도메인 규칙을 바꾸는 작업에서만 `../docs/domain.md`를 읽는다. 미구현·미결정 문서는 해당 범위를
직접 다루는 작업에서만 읽는다. 개인정보·약관과 `docs/policies/internal/`은 출시 정책 작업이 아니면 읽지 않는다.

## 실행과 검증

모든 명령은 `frontend/`에서 실행한다.

```bash
npm run dev
npm run lint
npm run build
```

- UI 변경은 최소 lint를 실행한다.
- 타입·라우팅·빌드 결과에 영향이 있으면 build까지 실행한다.
- 별도 테스트 러너는 아직 없다.

## 코드 규칙

- `app/`은 URL 파라미터와 화면 조립만 담당하는 얇은 라우트로 유지한다.
- 비즈니스 타입과 API 변환은 `features/`, 화면은 `components/`, 목 동작은 `mocks/`에 둔다.
- 기본 환경은 실제 API다. MSW는 명시적으로 활성화한 환경에서만 실행한다.
- 계약 변경은 타입, API 호출, MSW handler와 관련 문서를 함께 갱신한다.
- React 19에서는 `ref`를 일반 prop으로 받고 Context 소비에는 `use()`를 우선한다.
- 접근 가능한 이름, 키보드 포커스, 로딩·빈 상태·오류 상태를 함께 구현한다.
- UI 변경은 가능하면 모바일과 데스크톱에서 렌더링해 overflow와 상호작용을 확인한다.
