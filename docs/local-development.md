# 로컬 통합 실행

Docker Compose는 MySQL, LocalStack S3, Spring Boot와 Next.js를 하나의 네트워크에서 실행한다.

```bash
docker compose up --build -d --wait
```

- 프론트엔드: `http://localhost:3000`
- 백엔드 health: `http://localhost:8080/api/v1/health`
- 프론트 경유 health: `http://localhost:3000/api/v1/health`
- MySQL: `localhost:3307`
- LocalStack S3: `localhost:4566`

운영 대시보드(`/admin`)를 로컬에서 확인하려면 루트 `.env`에 `YESULIN_ADMIN_ACCOUNTS`를 설정한다. 값이 없으면
운영자 계정이 만들어지지 않아 로그인할 수 없다.

```bash
YESULIN_ADMIN_ACCOUNTS=admin@yesulin.art:local-admin-passphrase
```

기본 Compose는 실제 Backend API를 사용한다. 목 시나리오가 필요할 때만 루트 `.env`에
`NEXT_PUBLIC_API_MOCKING=enabled`를 설정하고 프론트 이미지를 다시 빌드한다. OAuth에는 provider credential과
`SOCIAL_LOGIN_ENABLED=true`가 필요하다.

```bash
docker compose ps
curl --fail http://localhost:8080/api/v1/health
docker compose down
```

MySQL data와 로그 volume까지 제거하는 `docker compose down --volumes`는 로컬 데이터를 지워도 되는 경우에만 사용한다.

