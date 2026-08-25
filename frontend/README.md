# 예술IN 프론트엔드

기획사/제작사 관리자 화면과 배우 공개 공고·지원서 흐름을 제공하는 Next.js 애플리케이션이다. 전체 제품 범위와 공통 개발 방식은 [프로젝트 README](../README.md)를 기준으로 한다.

## 실행과 검증

Node.js 24 이상이 필요하다. 저장소 루트의 `.nvmrc`는 팀과 CI의 권장 메이저 버전 24를 지정한다. 모든 명령은 이 디렉터리에서 실행한다.

```bash
npm install
cp -n .env.example .env.development.local
npm run dev
npm run lint
npm run build
npm run start
```

- 개발 서버: `http://localhost:3000`
- 기획사/제작사 관리자: `/producers/performances`
- 실제 API의 서버 조회 origin: `API_ORIGIN`
- MSW 활성화 시 목 시나리오 허브: `/dev/scenarios`

별도 테스트 러너는 아직 구성되어 있지 않다. UI 변경은 최소 `npm run lint`, 타입·라우팅·빌드에 영향을 주는 변경은 `npm run build`까지 확인한다.

기본 실행과 루트 `compose.yaml`의 로컬 통합 환경은 MSW를 시작하지 않고 Backend API만 호출한다. 목 시나리오가 필요한 경우에만 `.env.development.local`의 `NEXT_PUBLIC_API_MOCKING`을 `enabled`로 바꾼다.

## Vercel 배포

Production 프론트 주소는 `https://yesulin.art`다. Vercel의 `API_ORIGIN`에는 API origin인 `https://dcijkydwh7e79.cloudfront.net`을 설정한다. 값이 있으면 Next.js가 같은 origin의 `/api/v1/**`, `/oauth2/**`, `/login/oauth2/**` 요청을 CloudFront의 동일한 경로로 rewrite하며, 브라우저에는 CloudFront 주소를 노출하지 않는다.

`API_ORIGIN`이 없으면 rewrite를 만들지 않는다. MSW는 `NEXT_PUBLIC_API_MOCKING=enabled`일 때만 시작하며,
값을 생략한 CI·Docker·Vercel 빌드는 실제 API 모드다. 운영 환경에는 해당 변수를 설정하지 않는다.

아직 이관되지 않은 `/api/**`는 MSW로 유지하면서 기획사/제작사 가입·로그인을 실제 백엔드 API로
연결하려면 `NEXT_PUBLIC_PRODUCER_LOGIN=enabled`를 사용한다. 이 모드에서
`POST /api/v1/producers`, `POST /api/v1/sessions`, `GET /api/v1/sessions/current`, `DELETE /api/v1/sessions/current`는
MSW를 통과해 `API_ORIGIN`으로 전달된다.

공연·공고 생성과 구현 완료된 조회 API도 실제 백엔드로 연결하려면
`NEXT_PUBLIC_PRODUCER_API=enabled`를 함께 사용한다. 이 모드에서는 MSW가 공연·공고 관리 조회,
탐색 트리와 기획사/제작사 정보 `GET·PATCH /api/v1/producers/me`를 가로채지 않는다.

```bash
API_ORIGIN=http://localhost:8080 NEXT_PUBLIC_API_MOCKING=enabled NEXT_PUBLIC_PRODUCER_LOGIN=enabled NEXT_PUBLIC_PRODUCER_API=enabled npm run dev
```

실제 배우 소셜 로그인만 확인할 때는 `NEXT_PUBLIC_SOCIAL_LOGIN=enabled`를 사용한다.

```bash
API_ORIGIN=http://localhost:8080 NEXT_PUBLIC_API_MOCKING=enabled NEXT_PUBLIC_SOCIAL_LOGIN=enabled npm run dev
```

소셜 로그인 뒤 배우 프로필의 기본·추가 정보, 사진 보관함, 영상 보관함을 실제 Backend와
연결하려면 MSW 목 환경에서 `NEXT_PUBLIC_APPLICANT_PROFILE_API=enabled`를 함께 사용한다.
이 플래그가 없어도 `NEXT_PUBLIC_API_MOCKING`을 설정하지 않은 기본 모드는 실제 Backend API를 사용한다.

```bash
API_ORIGIN=http://localhost:8080 NEXT_PUBLIC_API_MOCKING=enabled NEXT_PUBLIC_SOCIAL_LOGIN=enabled NEXT_PUBLIC_APPLICANT_PROFILE_API=enabled npm run dev
```

실제 프로필은 정보·사진·영상을 각각의 `/api/v1/**` 리소스에 저장한다. 사진은 presigned URL로
파일을 먼저 업로드한 뒤 보관함에 연결한다. 사진 순서 변경과 대표 사진 지정도 각각의 사진 보관함
API로 즉시 저장한다.

백엔드의 소셜 로그인 성공 주소는 `/social-login/complete`로 설정한다. 이 완료 화면은 서버 세션을
확인하고 로그인 전에 보관한 안전한 내부 `returnTo`로 이동하며, 값이 없으면 `/applicants`로 간다.

## 구조

```text
src/
├── app/
│   ├── apply/[postingId]/          배우 공개 공고 라우트
│   │   └── write/[step]/           기본·추가·미디어·질문·검토 지원서 라우트
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

기본 개발 환경은 실제 API를 사용한다. MSW는 명시적으로 활성화한 목 검증 환경에만 사용한다. 시드·세션·저장 특성은 [현재 프론트 구현 상태](../docs/development/frontend/current-implementation.md), 화면별 확인 조건은 [MSW 시나리오](../docs/development/frontend/mock-scenarios.md)를 필요한 작업에서만 참조한다.

API 계약을 바꾸는 작업은 관련 타입, API 호출, MSW 핸들러와 문서를 같은 작업에서 갱신한다.
