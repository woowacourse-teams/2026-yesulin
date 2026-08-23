# Security와 Interceptor 책임 분리

## 계기

소셜 로그인은 Spring Security OAuth2 Client로 구현했지만, 나머지 API 인증까지
Spring Security가 맡으면 필터 체인 기본 동작이 기존 예외 계약과 어긋났다.
CSRF 기본 설정은 토큰을 세션에만 저장해 클라이언트가 토큰을 얻을 수 없었다.

## 결정

- Spring Security는 `/oauth2/**` 소셜 인증과 쓰기 요청 CSRF 검증만 맡는다.
  나머지 체인은 `permitAll`이며 세션·인증 컨텍스트·예외 처리를 끈다.
- 인증과 역할·상태 인가는 `LoginRequiredInterceptor`와
  `LoginMemberArgumentResolver`가 맡는다. 리소스 소유권은 기존대로
  application 계층이 검증한다.
- 세션 계약은 `MemberPrincipal(memberId, role, status)`를
  `memberPrincipal` 세션 속성에 담는 것이다. 로그인 방식과 무관하게 같다.
- CSRF 토큰은 쿠키로 발급하고 `X-CSRF-Token` 헤더로 받는다.
  세션 쿠키는 HttpOnly, CSRF 쿠키는 클라이언트가 읽어야 하므로 아니다.
- 응답은 401 `AUTH_UNAUTHENTICATED`, 403 `AUTH_FORBIDDEN`(역할 불일치),
  403 `AUTH_INACTIVE_MEMBER`(승인 전 계정)로 구분한다.

## 이유

인증 판단이 한 곳에 있어야 `@LoginRequired`를 빠뜨린 API를 찾기 쉽다.
Spring Security를 전역에 두면 기본 동작이 조용히 계약을 바꾸고, 실제로
CSRF 토큰이 발급되지 않아 테스트는 통과하지만 클라이언트는 쓰지 못했다.
OIDC ID Token 검증은 직접 구현할 위험이 커서 Spring Security에 남긴다.

## 영향

- 새 API는 `@LoginRequired`와 `@LoginMember(roles, statuses)`를 붙여야 보호된다.
- 세션의 `status`는 로그인 시점 사본이라 승인 상태 변경은 재로그인해야 반영된다.
- `local-test` 프로필은 인증을 우회하므로 인증 확인에는 `local`을 쓴다.
