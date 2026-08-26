# 예술IN

공연예술 오디션의 모집, 지원, 심사를 연결하는 서비스다.

- 배우는 공개 공고를 확인하고 지원서를 제출하며 프로필과 제출 이력을 관리한다.
- 기획사/제작사는 공연과 공고를 만들고 배역별로 지원자를 심사한다.
- 심사 결과는 `(지원서, 공고 배역, 차수)` 단위로 저장하고, 심사 종료는 공고 배역 전체 단위로 처리한다.

현재 제품 규칙은 [공통 도메인](./docs/domain.md), 실제 HTTP 계약은
[백엔드 API](./backend/docs/api.md)를 기준으로 한다. 아직 구현되지 않았거나 결정되지 않은 내용은 각각
[미구현](./docs/implementation-gaps.md), [미결정](./docs/pending-decisions.md) 문서에만 둔다.

## 실행

Node.js 24와 Java 25가 필요하다. 처음 한 번 루트 Git hook을 설치한다.

```bash
npm install
```

프론트엔드:

```bash
cd frontend
npm install
cp -n .env.example .env.development.local
npm run dev
```

백엔드:

```bash
cp -n .env.example .env
cd backend
./gradlew bootRun
```

기획사/제작사 인증 메일은 Google SMTP를 사용한다. `.env`에 `GOOGLE_SMTP_USERNAME`,
`GOOGLE_SMTP_APP_PASSWORD`, `GOOGLE_SMTP_FROM`, `EMAIL_VERIFICATION_URL`,
`EMAIL_VERIFICATION_REDIRECT_URI`, `PASSWORD_RESET_URL`을 설정한다. 실제 Google 계정 비밀번호가 아니라
2단계 인증에서 발급한 앱 비밀번호를 사용한다. 로컬도 같은 SMTP 설정으로 실제 인증 메일을 발송하며,
테스트에서만 Fake 발송기로 대체한다.

로컬 통합 실행은 [Docker 안내](./docs/local-development.md)를 따른다.

## 검증

```bash
cd frontend
npm run lint
npm run build

cd ../backend
./gradlew build
```

프론트엔드에는 별도 테스트 러너가 없다. 백엔드는 Gradle build에서 Checkstyle과 테스트를 실행한다.

## 구조

```text
backend/          Spring Boot API와 도메인·인프라
frontend/         Next.js UI와 선택적 MSW 시나리오
docs/             영역을 가로지르는 확정 규칙과 작업 보류 목록
ops/              백업·모니터링 스크립트
```

문서는 [문서 라우터](./docs/README.md)에서 현재 작업에 필요한 것만 선택한다.
