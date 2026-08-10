# AGENTS.md

이 문서는 이 저장소에서 작업하는 AI 코딩 에이전트가 공통으로 따라야 할 안내서다.

## 작업 원칙

- 기본 작업 범위는 `frontend/`와 그 동작을 설명하는 `docs/`다.
- 사용자가 명시적으로 요청하기 전에는 `backend/` 코드를 열거나 수정하지 않는다.
- 현재 우선순위는 백엔드 연동보다 공연사 관리자용 UI와 사용자 흐름을 완성하는 것이다.
- 코드를 바로 작성하기보다 먼저 관련 문서와 기존 컴포넌트 구조를 확인한다.
- 사용자 흐름이나 계약이 바뀌지 않는 내부 리팩터링에는 불필요한 문서 변경을 만들지 않는다.

## 프로젝트 개요

예술IN은 공연 공고로 유입된 지원자의 접수와 심사를 관리하는 서비스다.

현재 저장소 구조는 다음과 같다.

```text
2026-yesulin/
├── backend/    Spring Boot 애플리케이션
├── frontend/   공연사 관리자·지원자 공개 화면을 제공하는 Next.js 애플리케이션
└── docs/       프로젝트 운영 문서와 공연 관리 스펙
```

루트 `README.md`에 적힌 `frontend-producer/`, `frontend-applicant/` 분리는 장래 구상이며 현재 실제 프론트엔드 코드는 모두 `frontend/`에 있다. 지원자 공개 화면은 `/apply/{postingId}`에서 목 데이터로 동작한다.

현재 프론트엔드는 지원자·공연사 서비스 소개 랜딩, 인증 UI, 공연사 관리자의 지원자 심사 흐름과 지원자용 공개 공고 상세·지원서 작성·검토·목 접수 완료 흐름을 제공한다. 공개 지원서는 실제 저장이나 공연사 전달 없이 프론트엔드 목 상태만 검증한다. 심사 화면에서 필요한 타입과 API 계약을 먼저 확정하고 향후 백엔드가 이를 구현하는 계약 우선 방식이다.

## 먼저 읽을 문서

- `docs/온보딩.md`: 실행 방법, 화면 흐름, 코드 지도
- `docs/performance-management.md`: 공연 관리 영역의 도메인 규칙, 화면 경로, API 계약, MSW 동작
- `docs/README.md`: 구현과 문서를 함께 유지하는 기준
- `design.md`: UI 디자인 원칙, 디자인 토큰, 정보 위계와 공통 컴포넌트 표현 기준. UI를 구현하거나 수정하는 작업일 때 먼저 읽는다.

문서가 언급하는 `docs/index.html` 프로토타입은 현재 저장소에 없으므로 이를 기준 파일로 가정하지 않는다. 화면 의도는 살아 있는 스펙과 현재 구현을 우선해 판단하고, 모호하면 사용자에게 확인한다.

## 디자인 작업 규칙

- 화면을 새로 만들거나 레이아웃, 색상, 타이포그래피, 간격, 상태 표현, 공통 컴포넌트의 시각적 형태를 변경할 때는 작업 전에 `design.md`를 확인한다.
- 디자인 구현은 `design.md`에 정의된 정보 위계, 디자인 토큰, Primary Action, 접근성과 상태 표현 원칙을 우선한다.
- 기존 기능은 명시적인 요청 없이 제거하거나 다른 기능으로 대체하지 않는다. 디자인 변경 뒤에도 현재 사용자 흐름과 동작을 유지한다.
- `design.md`, 현재 구현, 사용자의 요구사항이 충돌하거나 우선순위를 판단하기 어려우면 임의로 결정하지 않고 사용자에게 확인한다.
- 사용자 흐름이나 API 계약이 바뀌지 않는 순수 시각 변경에는 별도의 기능 문서 변경을 만들지 않는다.

## 프론트엔드 실행과 검증

모든 명령은 `frontend/`에서 실행한다.

```bash
npm run dev
npm run lint
npm run build
npm run start
```

- 개발 서버의 기본 주소는 `http://localhost:3000`이다.
- 관리자 진입 경로는 `/producers/performances`다.
- 별도 테스트 러너는 아직 구성되어 있지 않다.
- UI 변경 후 최소한 `npm run lint`를 실행한다.
- 타입, 라우팅, 빌드 결과에 영향을 줄 수 있는 변경은 `npm run build`까지 실행한다.

## 프론트엔드 구조

```text
frontend/src/
├── app/
│   ├── apply/[postingId]/          지원자 공개 공고·지원서 라우트
│   └── producers/                  공연사 관리자 라우트
├── features/auditions/             JSX 없는 심사 도메인·API 계층
├── features/applications/          공개 공고 읽기 모델·지원서 규칙
├── components/
│   ├── producers/                  관리자 셸과 사이드바
│   ├── auditions/                 심사 UI
│   ├── applications/              지원자 공개 공고·지원서 UI
│   └── mocks/                      MSW 초기화 컴포넌트
└── mocks/                          MSW 핸들러와 인메모리 목 데이터
```

주요 파일:

- `features/auditions/types.ts`: 도메인 모델과 요청·응답 타입
- `features/auditions/api.ts`: Notion 정본의 `/api` REST 요청
- `features/auditions/routes.ts`: 관리자 화면 경로
- `features/applications/public-posting.ts`: 공개 공고 읽기 모델과 목 직렬화
- `features/applications/public-posting-server.ts`: 메타데이터·SSR용 공개 공고 조회
- `features/applications/application-form-state.ts`: 지원서 검증과 목 제출 상태 규칙
- `components/auditions/board-workspace.tsx`: 심사 화면 상태와 액션의 중심
- `components/auditions/board-context.tsx`: 심사 하위 UI의 공유 인터페이스
- `components/applications/public-application-context.tsx`: 공개 지원서 상태와 액션의 공유 인터페이스
- `mocks/handlers.ts`: 실제 백엔드가 맞춰야 할 목 API 동작
- `app/globals.css`: Tailwind 테마와 전역 디자인 토큰

라우트 파일은 URL 파라미터를 변환해 화면 컴포넌트에 전달하는 얇은 계층으로 유지한다. 비즈니스 규칙은 `features/auditions/`, 화면 표현은 `components/auditions/`에 둔다.

## 도메인과 화면 규칙

```text
Performance 공연
  └ Posting 공고
      └ Role 배역
          └ Application 지원서
```

- 전형은 배역 단위로 독립 진행하며 차수 상태는 `(배역, 차수)`에 속한다.
- 심사 결과는 `(지원서, 차수)`에 속하며 다음 차수가 이전 기록을 덮어쓰면 안 된다.
- 1차 결과에는 `불참`이 없고, 2·3차에서는 선택할 수 있다.
- 이전 차수를 마감해야 다음 차수 합격자 풀이 열린다.
- 검토 대기가 남아 있거나 대상자가 없으면 차수를 마감할 수 없다.
- 배역 조건과 다른 지원자는 차단하지 않고 `mismatchReasons`로 표시한다.
- 배역이 하나이거나 자유 배역 공고이면 배역 선택 화면을 건너뛴다.
- 관리자 화면은 검색 엔진에 노출하지 않는다.

## API와 MSW 규칙

- API 경로는 절대 URL이 아닌 Notion API 명세의 `/api/**` 상대 경로를 사용한다.
- 클라이언트는 공연사 식별자를 요청에 넣지 않는다.
- `PATCH /api/screenings/reviews`와 `POST /api/screenings/rounds/close`는 갱신된 `AuditionBoardResponse` 전체를 반환한다.
- 변경 응답을 받은 클라이언트는 별도 재조회 대신 새 보드로 상태를 교체한다.
- 기본 개발 환경에서는 MSW를 사용하며 `NEXT_PUBLIC_API_MOCKING=disabled`일 때 비활성화한다.
- 실제 API 환경의 공개 공고 메타데이터·SSR 조회에는 `API_ORIGIN`을 사용하고, 브라우저 API 요청은 같은 origin의 `/api/**` 상대 경로를 유지한다.
- 목 심사 상태는 브라우저 메모리에 있어 새로고침하면 초기화된다.
- 실제 API 계약을 바꾸는 UI 작업은 `types.ts`, `api.ts`, MSW 핸들러, 관련 문서를 함께 맞춘다.

## 프론트엔드 코딩 규칙

- Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS v4 기준을 따른다.
- 소스 파일은 순수 코드 250줄 이하로 유지하고 역할별로 분리한다.
- 불리언 프롭을 계속 추가하기보다 합성과 명시적인 변형 컴포넌트를 사용한다.
- 공유 상태는 Provider와 작은 Context 인터페이스로 끌어올리고 프롭 드릴링을 피한다.
- React 19에서는 `forwardRef`를 사용하지 않고 `ref`를 일반 프롭으로 받는다.
- Context 소비에는 `useContext()` 대신 `use()`를 사용한다.
- effect 본문에서 동기적으로 `setState`하지 않는다. 렌더 중 파생하거나 이벤트 핸들러로 옮기거나 `key`로 상태를 초기화한다.
- 일반 `button`에는 `aria-selected`를 사용하지 않는다. 단계는 `aria-current`, 토글은 `aria-pressed`를 사용한다.
- 접근 가능한 이름, 키보드 포커스, 로딩·빈 상태·오류 상태를 함께 구현한다.
- 숫자 통계에는 기존 `.num` 유틸리티를 재사용한다.
- `globals.css`의 요소 선택자 기본 규칙은 반드시 `@layer base` 안에 둔다.
- 사용자에게 보이는 문구와 기존 브랜드·상태 색상 토큰을 임의로 중복 정의하지 않는다.

상세한 React 구성 및 성능 규칙은 `frontend/.agents/skills/`의 Vercel 규칙집을 참고한다.

## 문서 동기화

다음 변경은 구현과 같은 작업 단위에서 관련 `docs/` 문서도 갱신한다.

- 사용자 흐름 또는 비즈니스 규칙
- 화면 경로
- API 요청·응답 구조
- 권한, 상태 전이, 데이터 생명주기
- MSW와 실제 백엔드가 공유해야 할 계약
- 환경 변수, 실행 명령, 폴더 구조
- 팀이 알아야 할 현재 한계나 의사결정

문서와 구현이 다르면 작업이 완료된 것으로 보지 않는다.
