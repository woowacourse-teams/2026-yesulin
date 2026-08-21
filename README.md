# 예술IN

공연예술 오디션의 모집과 심사를 연결하는 서비스입니다.

- 배우는 외부 공고의 링크로 들어와 프로필과 자료를 제출하고 지원 이력을 관리합니다.
- 기획사/제작사는 공연·공고·배역을 만들고 배우를 차수별로 검토합니다.
- 공고에는 하나 이상의 배역과 지원서가 있고, 지원서는 공고 설정에 따라 하나 이상의 배역을 선택합니다.

전형은 배역별로 독립 진행하며 심사 결과는 `(지원서, 배역, 차수)`별로 보존합니다. 최신 규칙은 [도메인 설계](./docs/domain-design.md), 작업별 상세 자료는 [문서 라우터](./docs/README.md)를 기준으로 합니다.

## 현재 범위

프런트엔드 프로토타입에서는 서비스 소개·인증 UI, 공연·공고 관리, 최대 5차 배우 심사, 공개 지원서 제출·조회, 배우 프로필과 기획사/제작사 설정이 MSW로 동작합니다. 배우는 카카오·네이버·Google 소셜 로그인을 모의하고, 기획사/제작사는 이메일 로그인과 가입 후 `PENDING` 접근 제한을 확인할 수 있습니다. MSW 인메모리 저장소는 화면 확인용 시드와 현재 브라우저 세션에서 만든 데이터를 사용합니다.

백엔드는 공연·배역, presigned 파일 업로드와 공고 DRAFT의 기본 정보·배역·일정·지원 폼 저장, 게시 상태
전이와 전형별 심사 결과 저장을 구현했습니다. 실제 S3, 소셜 로그인, 사업자·KOPIS 검증과 배우용 공개
공고·지원서 조회는 아직 연결하지 않았습니다. MSW에서
새로 만든 데이터는 새로고침하면 초기화될 수 있습니다.

## 실행

Node.js 24 이상이 필요합니다. `.nvmrc`는 팀과 CI가 사용하는 권장 메이저 버전 24를 지정합니다. 클론 후 루트에서 먼저 Husky hook을 설치합니다.

```bash
npm install
```

커밋 메시지는 항상 검사하며, 백엔드 Java·Checkstyle 설정이 staged diff에 있을 때만 Checkstyle을 실행합니다.

프런트엔드:

```bash
cd frontend
npm install
npm run dev
npm run lint
npm run build
```

- 기본 주소: `http://localhost:3000`
- 기획사/제작사 진입: `/producers/performances`
- 실제 API 연결: `NEXT_PUBLIC_API_MOCKING=disabled`

백엔드:

```bash
cd backend
./gradlew bootRun
./gradlew bootRun --args='--spring.profiles.active=local-test'
./gradlew build
./gradlew test
```

`local-test` 프로필은 H2와 Testcontainers LocalStack S3를 사용한다. 인증 구현 전에는 요청에
`MemberPrincipal(1)` 세션을 주입하며, 서버를 재시작하면 DB와 LocalStack 파일이 초기화된다.

## 지속적 통합

`.github/workflows/ci.yml`은 `main` 대상 Pull Request와 `main` push에서 실행됩니다. Frontend와 Backend Job은 서로 독립된 GitHub-hosted runner에서 병렬 실행됩니다.

- Frontend: `npm ci`, lint, production build
- Backend: Java 25와 Gradle Wrapper로 Checkstyle, test, executable build
- CI가 모두 통과한 뒤에만 `main`으로 병합하는 규칙은 GitHub 저장소 Ruleset에서 별도로 설정합니다.

## 개발 방식

프런트에서 필요한 계약을 먼저 검증하고 백엔드가 이를 구현합니다.

```text
화면 → 타입 → API 호출 → MSW 동작 → 문서 → 백엔드
```

- 현재 프런트 계약: `frontend/src/features/**/api.ts`
- 요청 검증과 목 응답: `frontend/src/mocks/`
- 백엔드 목표 경로와 이관 상태: [API 컨벤션](./docs/convention/api-convention.md)
- 사용자별 비즈니스 흐름: [개발 상세 문서](./docs/development/README.md)

문서와 구현이 다르면 완료로 보지 않습니다. 변경 기록 기준은 [문서 운영 원칙](./docs/README.md)을 따릅니다.

## 코드 지도

```text
yesulin/
├── backend/                  Spring Boot 4.1, Java 25
├── frontend/                 Next.js 16, React 19
│   └── src/
│       ├── app/              라우트
│       ├── features/         도메인 타입과 API
│       ├── components/       화면과 상태
│       └── mocks/            MSW 핸들러와 목 데이터
└── docs/
    ├── convention/           API·Git·백엔드 규칙
    ├── decisions/            현재 개발에 필요한 on-demand 결정
    ├── development/          상세 설계·검증·흐름
    └── policies/public/      공개 개인정보·서비스 정책
```

프런트엔드는 `app → features → components → mocks` 순서로 읽습니다. 라우트는 얇게 유지하고 비즈니스 규칙은 `features/`, 화면 표현은 `components/`에 둡니다.

## 문서

- [문서 라우터](./docs/README.md)
- [도메인 설계](./docs/domain-design.md)
- [API·Git·백엔드 컨벤션](./docs/convention/)
- [개발 상세 문서](./docs/development/README.md)
- [결정 기록](./docs/decisions/README.md)
- [프론트엔드 안내](./frontend/README.md)
- [공개 정책](./docs/policies/public/README.md)

## 참고

- 다른 Next 개발 서버가 실행 중이면 기존 서버를 사용하거나 종료한 뒤 다시 실행합니다.
- 화면이 로딩에서 멈추면 `frontend/public/mockServiceWorker.js`와 브라우저 콘솔을 확인합니다.
- 실제 API의 SSR 조회에는 `API_ORIGIN`을 설정합니다. 브라우저 요청은 같은 origin의 상대 경로를 사용합니다.
- 현재 통합 기준은 `origin/main`입니다. push 전에 fetch한 뒤 현재 브랜치를 그 위로 rebase합니다.
