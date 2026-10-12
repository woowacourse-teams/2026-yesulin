# 백엔드 작업 규칙

루트 `AGENTS.md`와 함께 적용한다. 모든 백엔드 문서를 미리 읽지 않는다.

| 작업 | 추가로 읽을 문서 |
| --- | --- |
| API Controller·DTO·오류 | [api.md](./docs/api.md), [공통 API 규칙](../docs/api-conventions.md) |
| aggregate·service·repository | [domain-implementation.md](./docs/domain-implementation.md) |
| 레이어·인증·QueryDSL·코드 스타일 | [architecture.md](./docs/architecture.md) |
| S3·파일·보관함 | [storage.md](./docs/storage.md) |
| 배포·백업·모니터링·비용 | 해당 [operations](./docs/operations/) 문서 |

공통 제품 규칙이 바뀌는 작업에서만 `../docs/domain.md`를 읽는다. 미구현·미결정 문서는 그 범위를 직접
구현하거나 결정할 때만 읽는다. 개인정보·약관 문서는 정식 출시 정책 작업이 아니면 읽지 않는다.

## 검증

```bash
./gradlew test
./gradlew build
```

- 테스트는 domain과 application에만 작성한다. presentation(Controller·DTO·필터, in)과 infrastructure(외부 연동·
  Slack·문자 업체, out)는 당분간 새 테스트를 추가하지 않고 로컬 실행과 실제 요청으로 직접 확인한다.
- 기존 presentation·infrastructure 테스트는 지우지 않으며, 변경으로 깨지면 그 변경에 맞게 고친다.
- API 계약 변경은 Controller, DTO와 `docs/api.md`를 함께 맞추고 실제 요청으로 확인한다.
- Checkstyle을 우회하지 않는다.

