# 예술IN 프론트엔드

공연사 관리자 화면과 지원자 공개 공고·지원서 흐름을 제공하는 Next.js 애플리케이션이다. 전체 제품 범위와 공통 개발 방식은 [프로젝트 README](../README.md)를 기준으로 한다.

## 실행과 검증

Node.js 22.12 이상이 필요하다. 모든 명령은 이 디렉터리에서 실행한다.

```bash
npm install
npm run dev
npm run lint
npm run build
npm run start
```

- 개발 서버: `http://localhost:3000`
- 공연사 관리자: `/producers/performances`
- 지원자 공개 공고: `/apply/{postingId}`
- 목 계정: `admin` 또는 `yesulin` / `1234`
- MSW 비활성화: `NEXT_PUBLIC_API_MOCKING=disabled`
- 실제 API의 서버 조회 origin: `API_ORIGIN`

별도 테스트 러너는 아직 구성되어 있지 않다. UI 변경은 최소 `npm run lint`, 타입·라우팅·빌드에 영향을 주는 변경은 `npm run build`까지 확인한다.

## 구조

```text
src/
├── app/
│   ├── apply/[postingId]/          지원자 공개 공고·지원서 라우트
│   └── producers/                  공연사 관리자 라우트
├── features/auditions/             JSX 없는 심사 도메인·API 계층
├── features/applications/          공개 공고 읽기 모델·지원서 규칙
├── components/
│   ├── producers/                  관리자 셸과 사이드바
│   ├── auditions/                  심사 UI
│   ├── applications/               지원자 공개 공고·지원서 UI
│   └── mocks/                      MSW 초기화 컴포넌트
└── mocks/                          MSW 핸들러와 인메모리 목 데이터
```

라우트는 URL 파라미터를 화면 컴포넌트에 전달하는 얇은 계층으로 유지한다. 비즈니스 규칙은 `features/`, 화면 표현은 `components/`, 목 API 동작은 `mocks/`에 둔다.

## 주요 문서

- [프론트엔드 작업 규칙](./AGENTS.md)
- [디자인 시스템](./docs/design-system.md)
- [도메인 설계](../docs/domain-design.md)
- [지원자 흐름](../docs/flowchart/actor.mmd)
- [공연사 흐름](../docs/flowchart/producer.mmd)
- [목표 API와 이관 상태](../docs/convention/api-convention.md)

현재 공개 지원서는 실제 서버 Draft나 공연사 전달 없이 프론트엔드 상태로만 동작한다. `/apply/lookup`에는 목표 정책에서 제거하기로 한 비로그인 제출 지원서 조회 UI가 아직 남아 있다. 목표 정책과 구현 차이는 도메인 설계 문서의 `현재 구현 상태와 차이`를 기준으로 확인한다.

## MSW와 실제 API

기본 개발 환경은 MSW를 사용한다. 목 심사 상태는 브라우저 메모리에 있어 새로고침하면 초기화될 수 있다. 브라우저 API 요청은 같은 origin의 `/api/**` 상대 경로를 사용하고, 공개 공고의 SSR·메타데이터 조회만 `API_ORIGIN`을 사용한다.

API 계약을 바꾸는 작업은 관련 타입, API 호출, MSW 핸들러와 문서를 같은 작업에서 갱신한다.
