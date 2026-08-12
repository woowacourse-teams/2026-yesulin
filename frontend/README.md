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
- 지원자 공개 공고: `/apply/seed_posting_1`
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

현재 공개 지원서는 로그인 전 작성과 최종 검토 UI를 제공하고, 공고별 입력값·선택 배역·진행 단계·사진 Blob을 IndexedDB에 저장한다. 저장 상태는 `저장 중`, `이 기기에 저장됨`, `저장 실패`로 구분하며 실제 저장되지 않은 변경이 있을 때만 이탈을 경고한다. 새로고침, 공고 상세 왕복, 로그인·회원가입 화면 왕복 뒤 같은 브라우저의 Draft를 복원하지만 서버 Draft 동기화와 인증 계정 자동 연결은 아직 구현하지 않았다. 최종 제출은 인증을 요구하며 제출 지원서는 계정의 내 지원서에서 읽기 전용 스냅샷으로 확인한다. 목표 정책과 구현 차이는 도메인 설계 문서의 `현재 구현 상태와 차이`를 기준으로 확인한다.

`returnTo`가 `/apply/{postingId}`인 인증 화면은 일반 로그인·회원가입과 다른 지원서 제출 문맥을 표시한다. 공고 읽기 모델에서 확인한 공연명·공고명과 검증된 배역을 보여 주고 지원자 계정을 기본 선택한다. 인증 성공 시 `prefill=1&resumeDraft=1`로 최종 검토 화면을 다시 열며, 명시적인 인증 취소 링크는 인증 상태를 만들지 않고 `resumeDraft=1`로 로컬 Draft만 복원한다. Draft는 현재 기기의 해당 브라우저 IndexedDB에만 있으며 서버나 다른 기기에 저장됐다고 안내하지 않는다.

## MSW와 실제 API

기본 개발 환경은 MSW를 사용한다. UI 검증을 위해 공연·공고·복수 배역 지원서 시드 1건을 제공하며, 추가로 만든 데이터와 심사 상태는 브라우저 메모리에 유지되어 새로고침하면 초기 상태로 돌아간다. 인증 화면은 실제 세션 API가 연결되기 전까지 입력 검증 후 역할별 화면으로 이동한다. 브라우저 API 요청은 같은 origin의 `/api/**` 상대 경로를 사용하고, 공개 공고의 SSR·메타데이터 조회만 `API_ORIGIN`을 사용한다.

API 계약을 바꾸는 작업은 관련 타입, API 호출, MSW 핸들러와 문서를 같은 작업에서 갱신한다.
