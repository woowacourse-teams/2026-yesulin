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

- 기획사/제작사 이메일 로그인과 배우 OIDC 로그인 모두 `MemberPrincipal`을 HttpSession에 저장한다.
- `LoginRequiredInterceptor`가 세션 존재를, `LoginMemberArgumentResolver`가 역할과 회원 상태를 검사한다.
- 공연·공고·심사는 `PRODUCER + ACTIVE`, 기획사 프로필은 상태와 무관한 `PRODUCER`, 배우 프로필·보관함은 `APPLICANT`를 요구한다.
- `/api/v1/admin/**`은 `ADMIN`만 요구한다. 운영자 계정은 가입 경로가 없고 `AdminAccountInitializer`가
  `yesulin.admin.accounts` 설정을 읽어 기동 시점에 만들거나 비밀번호를 맞춘다. 이미 다른 유형이 쓰는 이메일이면 기동을 멈춘다.
- Spring Security는 application 경로의 CSRF 검증을 담당한다. Cookie는 `XSRF-TOKEN`, header는 `X-CSRF-Token`이다.
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

- request ID를 MDC와 응답 `X-Request-Id`에 사용한다.
- 요청 로그는 method, URI, status, elapsed time만 기록한다.
- 요청·응답 본문, Cookie, token, 비밀번호, 연락처, 지원서 원문과 파일 URL은 일반 로그에 남기지 않는다.
- 운영자의 쓰기 작업은 `admin_audit_logs`에 실행자·대상·`이전 -> 이후`만 남기고 개인정보 원문은 담지 않는다.
- 기본 로그 파일은 실행 디렉터리 기준 `logs/yesulin.log`, 10MB 단위 압축, 14일·1GB 상한이다.

