# 예술IN 백엔드

Spring Boot 4.1, Java 25, MySQL 8.4, Flyway, QueryDSL과 S3 호환 저장소를 사용한다.

## 실행과 검증

저장소 루트 `.env`를 사용한다.

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

