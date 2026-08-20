# BE 컨벤션

## 코드 스타일

- 기준: `backend/checkstyle/wooteco_checks.xml`
- IDE 포맷: `backend/checkstyle/intellij-java-wooteco-style.xml`
- 실행: 저장소 루트에서 `npm run checkstyle`
- Checkstyle과 문서가 충돌하면 Checkstyle을 따른다.
- 한 줄이 120자 이하면 의미 없는 줄바꿈을 만들지 않는다.
- `var`와 제네릭 와일드카드는 사용하지 않는다.
- 멤버는 아래 순서로 배치한다.
  1. `static final` 상수: `public` → `private`
  2. `final` 필드: `public` → `private`
  3. 일반 필드: `public` → `private`
  4. 생성자
  5. 정적 메서드
  6. 인스턴스 메서드
  7. getter, `equals`, `hashCode`, `toString` 등 단순 메서드
- 호출하는 메서드와 그 구현은 가능한 한 가까이 둔다.

## 패키지와 레이어

```text
src/main
├── application/{command,result,...}
├── domain/{도메인별 패키지}
├── presentation/{api,event,scheduling,...}
└── infrastructure/{외부 기술별 패키지}
```

| 레이어 | 책임 |
| --- | --- |
| `application` | 도메인 조합, 트랜잭션·영속성 관리. 입출력은 `command`와 `result` 사용 |
| `domain` | 비즈니스 규칙과 모델. 외부 기술에 의존하지 않음 |
| `presentation` | API·이벤트·스케줄링 진입점. 형식 변환이 필요할 때만 DTO 추가 |
| `infrastructure` | DB, OAuth, S3 등 외부 기술 구현. application의 out port 구현 |

테스트는 `application`과 `domain`의 비즈니스 규칙을 우선 검증한다.

- API 입력 형식은 presentation의 Bean Validation, 도메인 불변식은 domain이 검증한다.
- 값 부재가 유효하지 않은 숫자 입력은 primitive를 사용한다. 생성 전 `null`이 필요한 JPA 식별자는 wrapper를 사용한다.
- 공통 예외 계약은 `common/exception`, HTTP 변환은 `presentation/api`에 둔다. 예외 메시지는 발생 지점에서 정한다.
- application service가 트랜잭션 경계이며 외부 기술은 application이 선언한 port를 구현한다.
- 입력값을 도메인 VO로 묶는 변환은 command의 명명된 메서드가 담당하고 service에서 같은 생성 로직을 반복하지 않는다.
- `common`, `global`, `util`을 포괄 폴더로 쓰지 않고 `validation`, `converter`, `exception`처럼 역할로 구분한다.

## API

- 경로와 인증 규칙: [API 경로 명세](./api-convention.md)
- 경로 버전: `/api/v1/...`
- 성공 응답: 별도 wrapper 없이 리소스를 반환한다.
- 실패 응답:

```json
{ "code": "ERROR_CODE", "message": "설명", "detail": null }
```

- 호환 변경은 `v1`을 유지하고, breaking change만 새 major 버전으로 분리한다.
- 폐기는 Expand-Migrate-Contract 순서로 진행하고 `deprecated` 여부와 종료 일정을 공지한다.

## 페이징

Spring Data `Pageable`과 `Page`를 API 계약에 노출하지 않는다.

### 페이지 방식

- 요청: `page`(기본 1), `size`(기본 10, 최대 100)
- offset: `(page - 1) * size`
- 응답: `common/page/PageTemplate<T>`

```json
{
  "totalElements": 123,
  "totalPages": 13,
  "currentPage": 1,
  "pageSize": 10,
  "hasNext": true,
  "content": []
}
```

### 커서 방식

- 요청: `cursor`, `size`
- 응답: `common/page/CursorTemplate<R, T>`
- `size + 1`개를 조회해 `hasNext`와 `nextCursor`를 계산한다.

```json
{ "hasNext": true, "nextCursor": "...", "content": [] }
```

## 로그

- 기본: `%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] %-5level %logger{36} [%class][%method][%line] %msg%n`
- 다중 서버·분산 추적 시: `[${server-name}] [%X{traceId:-}]`를 추가한다.
- 개인정보, 인증정보, 지원 답변은 로그에 남기지 않는다.
