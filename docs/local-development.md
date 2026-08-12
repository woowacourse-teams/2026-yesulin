# 로컬 개발 환경

## 사전 요구사항

- JDK 25
- 저장소에 포함된 Gradle Wrapper
- Docker Desktop과 Docker Compose
- MySQL 8.4 컨테이너를 실행할 수 있는 Docker daemon

로컬에 설치된 MySQL 서버나 MySQL 클라이언트의 버전은 기준이 아니다. 애플리케이션이 사용하는 데이터베이스 기준은 Docker의 `mysql:8.4` 이미지다.

## 환경 변수

저장소 루트에서 예시 파일을 복사한다.

```powershell
Copy-Item .env.example .env
```

`.env`의 비밀번호는 로컬에서 사용할 값으로 변경한다. `.env`는 Git에 커밋하지 않는다.

현재 로컬 기본값은 다음과 같다.

| 항목 | 값 |
| --- | --- |
| 데이터베이스 | `yesulin` |
| 애플리케이션 사용자 | `yesulin` |
| 호스트 포트 | `3307` |
| 컨테이너 포트 | `3306` |
| 문자셋 | `utf8mb4` |
| Docker 이미지 | `mysql:8.4` |

## MySQL 실행

저장소 루트에서 실행한다.

```powershell
docker compose up -d mysql
docker compose ps
docker compose logs mysql
```

`mysql` 서비스가 `healthy`가 된 뒤 backend를 실행한다. 데이터는 `yesulin_mysql_data` named volume에 보존된다.

일반 종료는 다음 명령을 사용한다.

```powershell
docker compose down
```

`docker compose down -v`는 데이터베이스 volume을 삭제하므로 데이터 초기화가 필요한 경우에만 명시적으로 실행한다.

## Backend 실행

현재 backend는 `local` 프로필에서 MySQL과 연결되도록 설정되어 있다.

PowerShell에서 backend를 실행할 때는 루트 `.env`의 값과 같은 값을 환경 변수로 전달한다.

```powershell
cd backend
$env:SPRING_PROFILES_ACTIVE = "local"
$env:DB_HOST = "localhost"
$env:DB_PORT = "3307"
$env:DB_NAME = "yesulin"
$env:DB_USERNAME = "yesulin"
$env:DB_PASSWORD = "<.env의 MYSQL_PASSWORD와 같은 값>"
\.gradlew.bat bootRun
```

검증 명령은 다음과 같다.

```powershell
\.gradlew.bat test
\.gradlew.bat build
```

Gradle distribution은 저장소에 포함된 Wrapper가 관리한다. 전역 Gradle 설치를 요구하지 않는다.

## 현재 준비 범위

- Docker Compose와 MySQL 8.4 실행 환경
- Spring local 프로필의 datasource 설정
- Flyway 활성화와 JPA schema validation
- LF 줄바꿈 정책

아직 도메인 migration과 제공 데이터 seed/import는 추가되지 않았다. 해당 작업은 최신 도메인 문서와 데이터 파일의 매핑을 확인한 뒤 별도 단계에서 구현한다.

## 문제 해결

`permission denied while trying to connect to the Docker API`가 나오면 Docker Desktop을 실행하고 Docker Engine이 시작된 뒤 다시 시도한다.

현재 로컬 MySQL 8.0 클라이언트가 설치되어 있어도 Docker 컨테이너의 MySQL 8.4 기준에는 영향을 주지 않는다. 컨테이너 접속이 필요하면 Docker 내부의 `mysql` 클라이언트를 사용하거나 호환되는 클라이언트를 사용한다.
