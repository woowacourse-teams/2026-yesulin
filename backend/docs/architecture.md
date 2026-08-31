# 백엔드 구조

## 레이어

```text
application/       use case 조합, 트랜잭션, command/result와 port
domain/            aggregate, value object, repository interface와 불변식
presentation/      REST API, 인증 진입점, event와 scheduling
infrastructure/    JPA·QueryDSL, OAuth, S3 등 외부 기술 adapter
```

- API 형식은 presentation의 Bean Validation, 도메인 불변식은 domain이 검증한다.
- application service가 트랜잭션 경계다.
- infrastructure는 application/domain이 선언한 port를 구현한다.
- 관리 화면의 복합 조회는 QueryDSL read model을 사용하고 aggregate의 쓰기 책임과 분리한다.
- 운영 대시보드 집계도 같은 방식으로 `domain/admin/query`의 읽기 모델이 담당한다.
- 공통 예외는 `common/exception`, HTTP 변환은 `presentation/api/ApiExceptionHandler`가 담당한다.

## 인증과 권한

- 기획사/제작사 이메일 로그인과 배우 OIDC 로그인 모두 `MemberPrincipal`을 HttpSession에 저장한다. 운영 HttpSession은
  Spring Session JDBC의 `SPRING_SESSION`, `SPRING_SESSION_ATTRIBUTES`에 영속화하므로 애플리케이션 재기동과 교체
  배포 후에도 유효 기간 안의 로그인을 유지한다.
- `LoginRequiredInterceptor`가 세션 존재를, `LoginMemberArgumentResolver`가 역할과 회원 상태를 검사한다.
- 공연·공고·심사는 `PRODUCER + ACTIVE`, 기획사 프로필은 상태와 무관한 `PRODUCER`, 배우 프로필·보관함은 `APPLICANT`를 요구한다.
- `/api/v1/admin/**`은 `ADMIN`만 요구한다. 운영자 계정은 가입 경로가 없고 `AdminAccountInitializer`가
  `yesulin.admin.accounts` 설정을 읽어 기동 시점에 만들거나 비밀번호를 맞춘다. 이미 다른 유형이 쓰는 이메일이면 기동을 멈춘다.
- Spring Security는 application 경로의 CSRF 검증을 담당한다. Cookie는 `XSRF-TOKEN`, header는 `X-CSRF-Token`이다.
- 이메일 인증 토큰은 `email_verifications`에 회원별 하나만 저장한다. 재발송은 기존 토큰을 교체하고 인증 성공 시
  토큰을 제거한다.
- OIDC는 Authorization Code, PKCE S256, state·nonce, issuer·audience·서명·만료 검증을 사용한다.
- Provider token은 저장하지 않고 `(issuer, subject)`만 소셜 계정 연결 키로 저장한다.

## 코드 규칙

- Checkstyle: `checkstyle/wooteco_checks.xml`
- IDE format: `checkstyle/intellij-java-wooteco-style.xml`
- 한 줄 120자, `var`와 제네릭 wildcard를 사용하지 않는다.
- 입력이 필수인 숫자는 primitive, 생성 전 null이 필요한 JPA 식별자는 wrapper를 사용한다.
- `common`, `global`, `util` 같은 포괄 폴더보다 역할 이름을 사용한다.
- 테스트는 domain과 application의 규칙을 우선하고 Controller 테스트로 HTTP 계약을 검증한다.

## 로그

- 콘솔은 `Asia/Seoul` 시각의 짧은 텍스트로, 파일은 한 이벤트가 한 줄인 Logstash JSON으로 기록한다.
  배포 프로세스의 `TZ=Asia/Seoul` 설정으로 JSON `@timestamp`도 같은 시각대를 사용한다.
- request ID를 MDC와 응답 `X-Request-Id`에 사용한다.
- 파일 JSON은 `@timestamp`, `level`, `logger_name`, `thread_name`, `message`와 MDC 필드를 분리해 저장한다.
- 요청이 끝나면 `HTTP_REQUEST`를 한 건만 기록한다. method, query string을 뺀 URI, endpoint 패턴, status,
  elapsed time과 존재하는 error code를 JSON 최상위 필드로 남긴다.
- 5xx는 `ERROR`, 1초 이상은 `WARN`, 나머지는 `INFO`다. 5xx가 느린 요청보다 우선하며, 짧은 주기의 폴링
  성공은 1초 미만일 때만 `DEBUG`로 낮춘다. 대상은 `/api/v1/health`와 `/api/v1/admin/logs`이며,
  실패와 느린 요청은 원래 레벨 정책대로 남긴다.
- `BusinessException`과 입력 오류는 예외 로그를 별도로 남기지 않고 최종 `HTTP_REQUEST`의 error code로 구분한다.
  MVC 경계를 빠져나온 예상 밖 예외만 `UNEXPECTED_ERROR`와 stack trace를 한 번 기록하고, 이어지는 최종
  `HTTP_REQUEST`에는 stack trace를 중복하지 않는다.
- application service의 500ms 미만 성공은 `SERVICE_CALL` DEBUG로 낮춘다. 500ms 이상이면 성공·실패 모두
  `SLOW_SERVICE` WARN으로 기록하되 인자, 반환값, 예외 메시지와 stack trace는 담지 않는다. 빠르게 실패한 호출은
  서비스 AOP에서 기록하지 않아 BusinessException과 예상 밖 예외가 HTTP 경계 로그와 중복되지 않게 한다.
- 요청·응답 본문, Cookie, token, 비밀번호, 연락처, 지원서 원문과 파일 URL은 일반 로그에 남기지 않는다.
- 삭제 확인 DTO·Command의 `toString()`은 비밀번호를 `[REDACTED]`로 마스킹한다. 객체의 JSON 직렬화는
  로그에 사용하지 않는다.
- 인증된 업로드 진단은 최종 실패와 재시도 성공만 기록한다. `X-Request-Id` incident ID, 허용된 흐름·단계·오류
  코드, 시도 횟수, 거친 플랫폼·브라우저와 서비스 워커 제어 여부만 남긴다.
- `FILE_METADATA_MISMATCH`는 `fileId`, 기대/실제 크기와 Content-Type을 기록한다. 파일명·소유자 ID·S3 URL은
  기록하지 않는다.
- 운영자의 쓰기 작업은 `admin_audit_logs`에 실행자·대상·상태 변화 또는 리소스 UUID만 남기고 개인정보 원문은 담지 않는다.
- 운영자 지원서 삭제는 별도 확인 비밀번호의 BCrypt 해시를 서버 설정에서 읽는다. 원문 비밀번호는 저장·로그하지 않고,
  확인 성공 뒤에만 지원서 행을 잠가 종속 데이터와 심사 완료 표시를 같은 트랜잭션에서 삭제한다.
- 삭제 확인의 계정별 반복 제한은 `AdminDeletionConfirmation`이 불변 상태와 원자적 `compute`로 처리한다.
  메모리 상태는 삭제 트랜잭션 롤백과 무관하게 유지된다. 잠금 정책과 운영 제약은 [배포 문서](operations/deployment.md)를 따른다.
- 운영자는 `/api/v1/admin/logs`로 같은 로그 파일의 끝부분을 읽을 수 있다. 경로는 설정으로 고정하고 읽기 상한을 둔다.
  조회 응답은 기존 `lines`와 구조화된 `entries`를 함께 제공한다. 배포 전에 남은 텍스트는 `LEGACY`, JSON은
  `STRUCTURED`로 판별하며, 파싱할 수 없는 줄 하나가 전체 조회를 실패시키지 않는다.
- 기본 로그 파일은 실행 디렉터리 기준 `logs/yesulin.log`, 10MB 단위 압축, 14일·1GB 상한이다.
