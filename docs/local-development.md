# 로컬 통합 실행

Docker Compose는 MySQL, LocalStack S3, Spring Boot와 Next.js를 하나의 네트워크에서 실행한다.
실행 전에 `config/server/local.env`를 만든다. Compose는 이 파일을 백엔드 컨테이너에 읽기 전용으로 연결하고,
Spring이 SMTP·OAuth 등 애플리케이션 설정을 직접 읽는다. 기존 루트 `.env`는 Compose의 MySQL 접속 정보와
프론트엔드 설정에 계속 사용한다. Docker 실행 시 DB 이름·계정·비밀번호는 루트 `.env`의 값이 백엔드에도 전달되므로,
`config/server/local.env`의 DB 값과 다르게 설정하지 않는다.

```bash
docker compose up --build -d --wait
```

- 프론트엔드: `http://localhost:3000`
- 백엔드 health: `http://localhost:8080/api/v1/health`
- 프론트 경유 health: `http://localhost:3000/api/v1/health`
- MySQL: `localhost:3307`
- LocalStack S3: `localhost:4566`

운영 대시보드(`/admin`)를 로컬에서 확인하려면 `config/server/local.env`에 `YESULIN_ADMIN_ACCOUNTS`를 설정한다. 값이 없으면
운영자 계정이 만들어지지 않아 로그인할 수 없다.

```bash
YESULIN_ADMIN_ACCOUNTS=admin@yesulin.art:local-admin-passphrase
```

기본 Compose는 실제 Backend API를 사용한다. 목 시나리오가 필요할 때만 루트 `.env`에
`NEXT_PUBLIC_API_MOCKING=enabled`를 설정하고 프론트 이미지를 다시 빌드한다. OAuth에는
`config/server/local.env`의 provider credential과 `SOCIAL_LOGIN_ENABLED=true`가 필요하다.

```bash
docker compose ps
curl --fail http://localhost:8080/api/v1/health
docker compose down
```

MySQL data와 로그 volume까지 제거하는 `docker compose down --volumes`는 로컬 데이터를 지워도 되는 경우에만 사용한다.
