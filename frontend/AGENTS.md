# 프론트엔드 작업 규칙

이 문서는 `frontend/` 아래에서 작업할 때 루트 `AGENTS.md`와 함께 적용한다.

## 먼저 읽기

- [프론트엔드 README](./README.md): 실행, 구조와 현재 한계
- [문서 라우터](../docs/README.md): 작업별 on-demand 문서 선택

UI 변경은 [디자인 시스템](../docs/development/frontend/design-system.md), MSW·시나리오 변경은 [검증 시나리오](../docs/development/frontend/mock-scenarios.md), 사용자 흐름 변경은 [개발 상세 문서 라우터](../docs/development/README.md)를 추가로 읽는다. 도메인·Draft·권한·상태 전이를 바꿀 때만 [도메인 설계](../docs/domain-design.md)를 읽는다. API 계약이나 결정 배경은 해당 작업에서만 API 문서와 결정 기록을 확인한다.

## 실행과 검증

모든 명령은 `frontend/`에서 실행한다.

```bash
npm run dev
npm run lint
npm run build
npm run start
```

- UI 변경 후 최소 `npm run lint`를 실행한다.
- 타입, 라우팅 또는 빌드 결과에 영향을 주면 `npm run build`까지 실행한다.
- 별도 테스트 러너는 아직 구성되어 있지 않다.

## 구조와 책임

- `app/`: URL 파라미터를 변환해 화면에 전달하는 얇은 라우트
- `features/auditions/`: JSX 없는 심사 도메인 모델과 API
- `features/applications/`: 공개 공고 읽기 모델과 지원서 규칙
- `components/auditions/`: 공연사 심사 UI
- `components/applications/`: 지원자 공개 공고·지원서 UI
- `mocks/`: MSW 핸들러와 인메모리 목 데이터

공유 상태는 Provider와 작은 Context 인터페이스로 끌어올리고 프롭 드릴링을 피한다. 사용자 흐름과 도메인 규칙을 라우트 컴포넌트에 넣지 않는다.

## API와 MSW

- 기본 환경은 실제 API를 사용한다. MSW는 `NEXT_PUBLIC_API_MOCKING=enabled`를 명시한 목 검증 환경에서만 실행한다.
- 브라우저 요청은 같은 origin의 `/api/**` 상대 경로를 사용한다.
- 공개 공고 메타데이터·SSR 조회에는 `API_ORIGIN`을 사용한다.
- 현재 목 심사 상태는 브라우저 메모리에 있어 새로고침하면 초기화된다.
- 실제 계약 변경은 `types.ts`, `api.ts`, MSW 핸들러와 관련 문서를 함께 맞춘다.
- 변경 응답이 갱신된 전체 보드를 반환하는 현재 계약에서는 별도 재조회 대신 응답 상태로 교체한다.

## React·TypeScript 규칙

- Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS v4를 기준으로 한다.
- 소스 파일은 순수 코드 250줄 이하로 유지하고 역할별로 분리한다.
- 불리언 프롭을 계속 추가하기보다 합성과 명시적인 변형 컴포넌트를 사용한다.
- React 19에서는 `forwardRef` 대신 `ref`를 일반 프롭으로 받고 Context 소비에는 `useContext()` 대신 `use()`를 사용한다.
- effect 본문에서 동기적으로 `setState`하지 않는다. 렌더 중 파생하거나 이벤트 핸들러로 옮기거나 `key`로 상태를 초기화한다.
- 일반 `button`에는 `aria-selected`를 사용하지 않는다. 단계는 `aria-current`, 토글은 `aria-pressed`를 사용한다.
- 접근 가능한 이름, 키보드 포커스, 로딩·빈 상태·오류 상태를 함께 구현한다.
- 숫자 통계에는 기존 `.num` 유틸리티를 재사용한다.
- `globals.css`의 요소 선택자 기본 규칙은 `@layer base` 안에 둔다.
- 상세한 React 구성과 성능 규칙은 `.agents/skills/`의 Vercel 규칙집을 참고한다.

## 디자인 작업

- 레이아웃, 색상, 타이포그래피, 간격, 상태 표현 또는 공통 컴포넌트의 시각적 형태를 바꾸기 전에 `../docs/development/frontend/design-system.md`를 읽는다.
- 디자인 시스템의 정보 위계, 시맨틱 토큰, Primary Action, 접근성과 상태 표현을 우선한다.
- 기존 기능과 사용자 흐름을 시각 변경 때문에 제거하거나 다른 기능으로 대체하지 않는다.
- 디자인 문서, 현재 구현과 사용자 요구가 충돌하면 임의로 결정하지 않고 확인한다.
- 순수 시각 변경에는 별도의 기능 문서 변경을 만들지 않는다.
- 변경한 화면은 가능한 경우 모바일과 데스크톱에서 직접 렌더링해 정렬·간격·overflow와 상호작용 상태를 확인한다.

## 문서 동기화

화면 경로, 사용자 흐름, API 계약, MSW 동작, 환경 변수 또는 팀이 알아야 할 현재 한계가 바뀌면 관련 README와 `../docs/` 문서를 같은 작업에서 갱신한다.
