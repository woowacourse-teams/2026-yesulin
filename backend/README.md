# 예술IN

공연예술 오디션의 모집과 심사를 연결하는 서비스입니다.

- 지원자는 외부 공고의 링크로 들어와 프로필과 자료를 제출하고 지원 이력을 관리합니다.
- 공연사는 공연·공고·배역을 만들고 지원자를 차수별로 검토합니다.
- 공고에는 하나 이상의 배역과 지원서가 있고, 지원서는 공고 설정에 따라 하나 이상의 배역을 선택합니다.

전형은 배역별로 독립 진행하며 심사 결과는 `(지원서, 배역, 차수)`별로 보존합니다. 최신 규칙은 [도메인 설계](./docs/domain-design.md), 상세 사용자 흐름은 [flowchart](./docs/flowchart/)를 기준으로 합니다.

## 현재 범위

프런트엔드는 서비스 소개·인증 UI, 공연·공고 관리, 1~3차 지원자 심사, 공개 지원서, 지원자 프로필과 공연사 설정을 제공합니다. 기본 개발 모드는 MSW이며, 화면에서 만든 목 데이터는 브라우저 메모리에만 유지되어 새로고침하면 초기화될 수 있습니다.

백엔드는 Spring Boot 4.1과 MySQL 8.4 기반입니다. 세션·CSRF 인증, 회원과 공연사 멤버십, 공연·공고·배역, 지원자 프로필, Draft·지원서 스냅샷 영속화가 구현되어 있습니다. 익명 Draft·파일 업로드·최종 제출의 공개 API와 소셜 로그인, 사업자·KOPIS 검증은 아직 연결하지 않았습니다.

기본 실행에서는 프런트엔드가 MSW를 사용하고 백엔드는 별도 `localhost:8080`에서 실행됩니다. `NEXT_PUBLIC_API_MOCKING=disabled`로 MSW를 끌 수는 있지만, 현재 Next.js에서 backend로 전달하는 개발 proxy는 구성되어 있지 않으므로 이것만으로 전체 화면이 실제 API에 연결되지는 않습니다.

## 로컬 실행

아래 명령은 Windows 명령 프롬프트(CMD)와 저장소 루트 디렉터리를 기준으로 합니다.

### 사전 요구사항

- Node.js 22.12 이상과 npm
- JDK 25
- Docker Desktop과 Docker Compose
- 사용 중이지 않은 포트 `3000`, `3307`, `8080`

### 처음 실행할 때

1. 루트 개발 도구와 프런트엔드 의존성을 설치합니다.

```bat
npm install
cd frontend
npm install
cd ..
```

루트 설치는 Husky와 commitlint를 준비합니다. 이후 `package-lock.json`이 바뀐 경우에만 해당 디렉터리에서 `npm install`을 다시 실행하면 됩니다.

2. 로컬 환경 파일을 만들고 비밀번호를 변경합니다.

```bat
copy .env.example .env
```

`.env`의 `MYSQL_PASSWORD`와 `DB_PASSWORD`는 같은 로컬 비밀번호로 설정합니다. `MYSQL_ROOT_PASSWORD`도 예시값에서 변경합니다. `.env`는 Git에 커밋하지 않습니다.

3. Docker Desktop을 실행한 뒤 MySQL을 시작합니다.

```bat
docker compose up -d mysql
docker compose ps
```

`2026-yesulin-mysql-1`의 상태가 `healthy`가 될 때까지 기다립니다. 최초 실행 시 Flyway가 backend 시작 과정에서 DB 스키마를 자동 생성합니다.

4. 선택 사항으로 제공 mock seed를 한 번 이관합니다.

새 CMD 창에서 저장소 루트로 이동한 뒤 실행합니다. 비밀번호는 seed에 포함되지 않으며 BCrypt hash로만 DB에 저장됩니다.

```bat
for /f "usebackq eol=# tokens=1,* delims==" %A in (".env") do set "%A=%B"
set "YESULIN_SEED_PATH=C:\path\to\yesulin-mock-seed.json"
set "YESULIN_SEED_PRODUCER_PASSWORD=<8자 이상의 로컬 전용 비밀번호>"
cd backend
gradlew.bat bootRun --args="--spring.profiles.active=local,seed --server.port=0"
```

성공하면 공연사 1, 공연 5, 공고 5, 배역 16, 지원 양식 56건을 이관하고 프로세스가 자동 종료됩니다. 동일 파일을 다시 실행해도 중복 데이터는 생기지 않습니다. 자세한 범위는 [mock seed 매핑](./docs/mock-seed-import.md)을 참고합니다.

5. backend를 실행합니다. 새 CMD 창에서 저장소 루트로 이동해 `.env`를 현재 CMD 세션에 불러온 다음 실행합니다.

```bat
for /f "usebackq eol=# tokens=1,* delims==" %A in (".env") do set "%A=%B"
cd backend
gradlew.bat bootRun
```

로그에 `Started YesulinApplication`이 표시되면 backend는 `http://localhost:8080`에서 실행 중입니다.

6. 프런트엔드를 별도 CMD 창에서 실행합니다.

```bat
cd frontend
npm run dev
```

- 기본 주소: `http://localhost:3000`
- 공연사 화면: `http://localhost:3000/producers/performances`
- 기본 모드: MSW 활성화

### 그 이후 실행할 때

Docker Desktop을 시작한 뒤 다음 세 프로세스만 다시 실행하면 됩니다.

1. 저장소 루트: `docker compose up -d mysql`
2. backend CMD: `.env`를 위와 같이 불러온 뒤 `cd backend`, `gradlew.bat bootRun`
3. frontend CMD: `cd frontend`, `npm run dev`

MySQL의 named volume은 유지되므로 매번 migration이나 seed를 다시 실행할 필요가 없습니다. Flyway는 새 migration이 추가된 경우 backend 시작 시 적용합니다.

### 종료와 데이터 초기화

frontend와 backend는 각 CMD 창에서 `Ctrl+C`로 종료합니다. MySQL은 루트에서 다음과 같이 종료합니다.

```bat
docker compose down
```

이 명령은 DB 데이터를 보존합니다. 아래 명령은 MySQL volume과 로컬 데이터를 삭제하므로 완전 초기화가 필요할 때만 사용합니다.

```bat
docker compose down -v
```

### 검증 명령

```bat
cd backend
gradlew.bat test
gradlew.bat build

cd ..\frontend
npm run lint
npm run build
```

더 자세한 DB·seed 설정과 문제 해결 방법은 [로컬 개발 환경](./docs/local-development.md)을 참고합니다.

## 개발 방식

프런트에서 필요한 계약을 먼저 검증하고 백엔드가 이를 구현합니다.

```text
화면 → 타입 → API 호출 → MSW 동작 → 문서 → 백엔드
```

- 현재 프런트 계약: `frontend/src/features/**/api.ts`
- 요청 검증과 목 응답: `frontend/src/mocks/`
- 백엔드 목표 경로와 이관 상태: [API 컨벤션](./docs/convention/api-convention.md)
- 현재 백엔드 Postman 테스트: [Postman 가이드](./docs/backend-api-postman.md) · [컬렉션](./docs/postman/yesulin-backend.postman_collection.json)
- 사용자별 비즈니스 흐름: [flowchart](./docs/flowchart/)

문서와 구현이 다르면 완료로 보지 않습니다. 변경 기록 기준은 [문서 운영 원칙](./docs/README.md)을 따릅니다.

## 코드 지도

```text
yesulin/
├── backend/                  Spring Boot 4.1, Java 25
├── frontend/                 Next.js 16, React 19
│   ├── docs/                 프론트엔드 디자인 시스템
│   └── src/
│       ├── app/              라우트
│       ├── features/         도메인 타입과 API
│       ├── components/       화면과 상태
│       └── mocks/            MSW 핸들러와 목 데이터
└── docs/
    ├── convention/           API·Git·백엔드 규칙
    ├── decisions/            번호 기반 결정 기록
    ├── flowchart/            사용자별 비즈니스 흐름
    └── policies/             개인정보·서비스 정책
```

프런트엔드는 `app → features → components → mocks` 순서로 읽습니다. 라우트는 얇게 유지하고 비즈니스 규칙은 `features/`, 화면 표현은 `components/`에 둡니다.

## 문서

- [비즈니스 흐름](./docs/flowchart/)
- [API·Git·백엔드 컨벤션](./docs/convention/)
- [현재 백엔드 API·Postman 테스트](./docs/backend-api-postman.md)
- [결정 기록](./docs/decisions/README.md)
- [도메인 설계](./docs/domain-design.md)
- [문서 운영 원칙](./docs/README.md)
- [프론트엔드 안내](./frontend/README.md)
- [UI 디자인 시스템](./frontend/docs/design-system.md)
- [에이전트 작업 규칙](./AGENTS.md)

## 참고

- 다른 Next 개발 서버가 실행 중이면 기존 서버를 사용하거나 종료한 뒤 다시 실행합니다.
- 화면이 로딩에서 멈추면 `frontend/public/mockServiceWorker.js`와 브라우저 콘솔을 확인합니다.
- 실제 API의 SSR 조회에는 `API_ORIGIN`을 설정합니다. 브라우저 요청은 같은 origin의 상대 경로를 사용합니다.
- 현재 통합 기준은 `origin/main`입니다. push 전에 fetch한 뒤 현재 브랜치를 그 위로 rebase합니다.
