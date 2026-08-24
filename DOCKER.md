# Docker 로컬 실행

이 구성은 MySQL, LocalStack S3, Spring Boot, Next.js를 하나의 Docker 브리지 네트워크에서 실행한다.

## 실행

Docker Desktop 또는 Docker Engine을 시작한 뒤 저장소 루트에서 실행한다.

```bash
docker compose up --build -d --wait
```

- 프런트엔드: <http://localhost:3000>
- 백엔드 상태 확인: <http://localhost:8080/api/v1/health>
- 프런트엔드 경유 상태 확인: <http://localhost:3000/api/v1/health>
- MySQL 호스트 포트: `localhost:3307`
- LocalStack S3 호스트 포트: `localhost:4566`

Compose 내부에서는 호스트 포트가 아니라 서비스 이름과 컨테이너 포트를 사용한다.

```text
frontend -> http://backend:8080 -> jdbc:mysql://mysql:3306/yesulin
                               -> http://localstack:4566
```

포트나 로컬 비밀번호를 바꾸려면 저장소 루트에 `.env`를 만들고 필요한 값만 설정한다.

```dotenv
FRONTEND_HOST_PORT=3000
BACKEND_HOST_PORT=8080
MYSQL_HOST_PORT=3307
DB_NAME=yesulin
DB_USERNAME=yesulin
DB_PASSWORD=yesulin-local
MYSQL_ROOT_PASSWORD=yesulin-root-local
```

기본 비밀번호는 로컬 개발 전용이다. 실제 운영 자격증명으로 사용하지 않는다.

실제 Backend로 UUID 공고의 지원서를 제출하려면 배우의 Backend Session이 필요하다. 소셜 로그인을
확인할 때는 `.env.example`의 `SOCIAL_LOGIN_*`, `KAKAO_OIDC_*`, `NAVER_OIDC_*`,
`GOOGLE_OIDC_*` 항목 중 사용할 Provider 값을 루트 `.env`에 설정한다. Compose는 이 값을 Backend에
전달하며, 설정하지 않으면 소셜 로그인은 기본적으로 비활성화된다. Provider 개발자 콘솔에는
`http://localhost:3000/login/oauth2/code/{provider}` Callback을 등록한다.

외부 OAuth 자격증명이 없는 기본 Compose 환경에서는 로그인 화면의 소셜 버튼이 로컬 전용 배우
세션을 만들고 원래 지원서로 돌아간다. 이 API는 Spring `local` 프로필과
`LOCAL_SOCIAL_LOGIN_ENABLED=true`가 모두 적용될 때만 등록된다. 실제 OAuth를 확인할 때는 자격증명을
설정하고 `NEXT_PUBLIC_SOCIAL_LOGIN=enabled`로 Frontend 이미지를 빌드한다.

## 백엔드 변경 반영

일반적인 백엔드 코드와 설정 변경은 이미지를 다시 빌드해 반영한다.

```bash
docker compose up --build -d backend
```

변경한 설정이 반영되지 않거나 이전 이미지가 의심될 때만 캐시를 비우고 컨테이너를 강제로 다시 만든다.
`--no-cache`는 모든 이미지 빌드 단계를 다시 실행하므로 일상적인 실행 명령으로 사용하지 않는다.

```bash
docker compose build --no-cache backend
docker compose up -d --force-recreate backend
```

실행 중인 컨테이너의 로그 설정과 파일 생성 여부는 다음 명령으로 확인한다.

```bash
docker compose exec backend printenv LOG_FILE
docker compose exec backend ls -l /var/log/yesulin
docker compose exec backend tail -F /var/log/yesulin/yesulin.log
```

## 확인과 종료

```bash
docker compose ps
curl --fail http://localhost:8080/api/v1/health
curl --fail http://localhost:3000/api/v1/health
docker compose exec mysql mysqladmin ping -h mysql -uyesulin -pyesulin-local
docker compose exec backend tail -F /var/log/yesulin/yesulin.log
```

컨테이너만 종료하면 MySQL 데이터와 백엔드 파일 로그는 이름 있는 볼륨에 유지된다.

```bash
docker compose down
```

로컬 DB 데이터와 백엔드 파일 로그까지 제거하려는 경우에만 다음 명령을 사용한다.

```bash
docker compose down --volumes
```
