# 로컬 개발 환경

## 사전 요구사항

- JDK 25
- 저장소에 포함된 Gradle Wrapper
- Docker Desktop과 Docker Compose
- MySQL 8.4 컨테이너를 실행할 수 있는 Docker daemon

로컬에 설치된 MySQL 서버나 MySQL 클라이언트의 버전은 기준이 아니다. 애플리케이션이 사용하는 데이터베이스 기준은 Docker의 `mysql:8.4` 이미지다.

## 환경 변수

저장소 루트에서 예시 파일을 복사한다.

```bat
copy .env.example .env
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

```bat
docker compose up -d mysql
docker compose ps
docker compose logs mysql
```

`mysql` 서비스가 `healthy`가 된 뒤 backend를 실행한다. 데이터는 `yesulin_mysql_data` named volume에 보존된다.

일반 종료는 다음 명령을 사용한다.

```bat
docker compose down
```

`docker compose down -v`는 데이터베이스 volume을 삭제하므로 데이터 초기화가 필요한 경우에만 명시적으로 실행한다.

## Backend 실행

현재 backend는 `local` 프로필에서 MySQL과 연결되도록 설정되어 있다.

CMD에서 backend를 실행할 때는 루트 `.env`를 현재 CMD 세션의 환경 변수로 불러온다.

```bat
for /f "usebackq eol=# tokens=1,* delims==" %A in (".env") do set "%A=%B"
cd backend
gradlew.bat bootRun
```

검증 명령은 다음과 같다.

```bat
gradlew.bat test
gradlew.bat build
```

Gradle distribution은 저장소에 포함된 Wrapper가 관리한다. 전역 Gradle 설치를 요구하지 않는다.

## 제공 mock seed 이관

시드 이관은 `seed` 프로필을 명시할 때만 한 번 실행되고 애플리케이션이 종료된다. 파일에는 비밀번호가 없으므로 로컬 전용 공연사 비밀번호를 환경 변수로 전달한다. 이 값은 BCrypt hash로만 DB에 저장된다.

```bat
for /f "usebackq eol=# tokens=1,* delims==" %A in (".env") do set "%A=%B"
set "YESULIN_SEED_PATH=C:\path\to\yesulin-mock-seed.json"
set "YESULIN_SEED_PRODUCER_PASSWORD=<8자 이상의 로컬 전용 비밀번호>"
cd backend
gradlew.bat bootRun --args="--spring.profiles.active=local,seed --server.port=0"
```

`.env`의 `DB_*` 값도 일반 backend 실행과 동일하게 현재 셸에 설정해야 한다. import는 파일 전체 구조와 대상 레코드·참조·URL·열거형·기간을 먼저 검증하고, 성공한 경우에만 하나의 트랜잭션으로 반영한다. 재실행해도 `source_id`와 자연 키 기준으로 중복을 만들지 않는다.

현재 제공 파일에서 이관하는 범위와 제외 이유는 [mock seed 매핑](./mock-seed-import.md)을 따른다.

## 현재 준비 범위

- Docker Compose와 MySQL 8.4 실행 환경
- Spring local 프로필의 datasource 설정
- Flyway 활성화와 JPA schema validation
- Account/Applicant/CompanyMember, 공연·공고·배역, 프로필, Draft·제출 스냅샷 migration
- 명시적인 mock seed 검증·반복 이관
- LF 줄바꿈 정책

## 문제 해결

`permission denied while trying to connect to the Docker API`가 나오면 Docker Desktop을 실행하고 Docker Engine이 시작된 뒤 다시 시도한다.

현재 로컬 MySQL 8.0 클라이언트가 설치되어 있어도 Docker 컨테이너의 MySQL 8.4 기준에는 영향을 주지 않는다. 컨테이너 접속이 필요하면 Docker 내부의 `mysql` 클라이언트를 사용하거나 호환되는 클라이언트를 사용한다.
