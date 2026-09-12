# 예술IN 백엔드

Spring Boot 4.1, Java 25, MySQL 8.4, Flyway, QueryDSL과 S3 호환 저장소를 사용한다.

## 실행과 검증

`local` 프로필은 `config/server/local.env`를 반드시 읽는다. 이 파일은 config 저장소에서 Git 추적하지 않는다.
기존 저장소 루트 `.env`를 사용하는 개발자는 내용을 `config/server/local.env`로 옮겨야 한다.
변수 이름 차이는 저장소 루트에서 `sh scripts/config/compare-env-keys.sh`로 확인할 수 있다.
로컬 DB용 `DB_*`와 배포 DB용 `SPRING_DATASOURCE_*`처럼 의도적인 차이는 직접 검토한다.
Docker Compose는 변수 치환에 기존 루트 `.env`를 사용하고, 백엔드 컨테이너에는 `config/server/local.env`를 읽기 전용으로 연결한다.

```bash
cd backend
./gradlew bootRun
./gradlew test
./gradlew build
```

`local` 프로필은 MySQL과 Testcontainers LocalStack S3를 사용한다. 보호된 API는 인증 우회를 제공하지 않으므로
세션을 만든 뒤 호출한다.

## 문서

- [구조와 코드 규칙](./docs/architecture.md)
- [도메인 구현](./docs/domain-implementation.md)
- [API](./docs/api.md)
- [파일 저장](./docs/storage.md)
- [배포](./docs/operations/deployment.md)
- [백업](./docs/operations/backup.md)
- [모니터링](./docs/operations/monitoring.md)
