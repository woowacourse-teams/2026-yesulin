# 예술IN 프론트엔드

기획사/제작사 관리자 화면과 배우 공개 공고·지원서 흐름을 제공하는 Next.js 애플리케이션이다. 전체 제품 범위와 공통 개발 방식은 [프로젝트 README](../README.md)를 기준으로 한다.

## 실행과 검증

Node.js 24 이상이 필요하다. 저장소 루트의 `.nvmrc`는 팀과 CI의 권장 메이저 버전 24를 지정한다. 모든 명령은 이 디렉터리에서 실행한다.

```bash
npm install
npm run dev
npm run lint
npm run build
npm run start
```

- 개발 서버: `http://localhost:3000`
- 기획사/제작사 관리자: `/producers/performances`
- 배우 공개 공고: `/apply/seed_posting_1`
- 전체 항목·커스텀 3문항 검증 공고: `/apply/seed_posting_all_fields`
- 개발용 목 시나리오 허브: `/dev/scenarios`
- MSW 비활성화: `NEXT_PUBLIC_API_MOCKING=disabled`
- 실제 API의 서버 조회 origin: `API_ORIGIN`

별도 테스트 러너는 아직 구성되어 있지 않다. UI 변경은 최소 `npm run lint`, 타입·라우팅·빌드에 영향을 주는 변경은 `npm run build`까지 확인한다.

## 구조

```text
src/
├── app/
│   ├── apply/[postingId]/          배우 공개 공고·지원서 라우트
│   └── producers/                  기획사/제작사 관리자 라우트
├── features/auditions/             JSX 없는 심사 도메인·API 계층
├── features/applications/          공개 공고 읽기 모델·지원서 규칙
├── components/
│   ├── producers/                  관리자 셸과 사이드바
│   ├── auditions/                  심사 UI
│   ├── applications/               배우 공개 공고·지원서 UI
│   └── mocks/                      MSW 초기화 컴포넌트
└── mocks/                          MSW 핸들러와 인메모리 목 데이터
```

라우트는 URL 파라미터를 화면 컴포넌트에 전달하는 얇은 계층으로 유지한다. 비즈니스 규칙은 `features/`, 화면 표현은 `components/`, 목 API 동작은 `mocks/`에 둔다.

## 주요 문서

- [프론트엔드 작업 규칙](./AGENTS.md)
- [문서 라우터](../docs/README.md)
- [현재 프론트 구현 상태](../docs/development/frontend/current-implementation.md)
- [MSW 시나리오와 UI 검증 기준](../docs/development/frontend/mock-scenarios.md)
- [디자인 시스템](../docs/development/frontend/design-system.md)

## MSW와 실제 API

기본 개발 환경은 MSW를 사용한다. 시드·세션·저장 특성은 [현재 프론트 구현 상태](../docs/development/frontend/current-implementation.md), 화면별 확인 조건은 [MSW 시나리오](../docs/development/frontend/mock-scenarios.md)를 필요한 작업에서만 참조한다.

API 계약을 바꾸는 작업은 관련 타입, API 호출, MSW 핸들러와 문서를 같은 작업에서 갱신한다.
