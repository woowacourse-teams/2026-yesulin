# 소셜 로그인 연동 모듈

## 목적과 범위

카카오·네이버·구글 OIDC 인증은 Spring Security OAuth2 Client에 맡긴다. 우리 코드는 제공자 설정과 네이버 호환 규칙만 관리하고, 회원·로그인 기능에는 검증된 `SocialIdentity(provider, issuer, subject)`만 전달한다.

현재 모듈은 다음을 완료한다.

- Authorization Code 흐름과 Callback 처리
- 세션 기반 state 저장·검증
- PKCE S256 생성·검증값 전달
- Token 교환
- ID Token 서명, issuer, audience, 만료, nonce 검증
- JWKS 조회와 캐시
- 공통 `SocialIdentity` 변환

회원 연결 조회, 배우 최초 계정 자동 생성, 서비스 세션·쿠키와 로그인 후 이동은 로그인 담당 범위다.

## 구조

```text
/oauth2/authorization/{provider}
  -> Spring Security OAuth2 Client
    -> Provider 인증과 /login/oauth2/code/{provider} Callback
      -> SocialIdentityResolver
        -> SocialLoginSuccessHandler (로그인 담당 구현)
```

| 코드 | 책임 |
| --- | --- |
| `SocialLoginConfiguration` | 세 Provider 등록과 Spring Security 조립 |
| `ApplicationSecurityConfiguration` | 기존 API의 현재 공개 상태 유지. 회원 인증 구현 시 권한 정책으로 교체 |
| `NaverAuthorizationRequestResolver` | 네이버가 명시하지 않은 nonce만 제외 |
| `NaverTokenRequestParametersConverter` | 네이버 Token 요청에 필수 state 추가 |
| `NonPersistingAuthorizedClientRepository` | Provider Access·Refresh Token을 저장하지 않음 |
| `SocialIdentityResolver` | 검증된 Spring 인증 결과를 공통 식별자로 변환 |
| `SocialLoginSuccessHandler` | 로그인 담당자가 구현하는 유일한 인수인계 경계 |

직접 만든 Discovery Client, Token Client, JWT Validator와 로그인 트랜잭션 테이블은 사용하지 않는다.

## Provider 설정

세 Provider 모두 `openid` scope, Authorization Code, `client_secret_post`, PKCE S256을 사용한다. 사용자 정보 API는 호출하지 않고 Access Token·Refresh Token·ID Token을 저장하거나 외부에 반환하지 않는다.

| Provider | issuer | 시작 URL | Callback URL |
| --- | --- | --- | --- |
| Kakao | `https://kauth.kakao.com` | `/oauth2/authorization/kakao` | `/login/oauth2/code/kakao` |
| Naver | `https://nid.naver.com` | `/oauth2/authorization/naver` | `/login/oauth2/code/naver` |
| Google | `https://accounts.google.com` | `/oauth2/authorization/google` | `/login/oauth2/code/google` |

Provider 개발자 콘솔에는 배포 환경별 전체 Callback URL을 정확히 등록한다. 로컬 예시는 `http://localhost:8080/login/oauth2/code/kakao`다.

필요한 환경 변수는 `.env.example`을 따른다. 실제 값은 커밋하지 않는다.

## 로그인 담당자 사용법

로그인 담당자는 `SocialLoginSuccessHandler` Bean 하나만 구현한다.

```java
@Component
public class MemberSocialLoginHandler implements SocialLoginSuccessHandler {

    private final SocialLoginUseCase socialLoginUseCase;

    @Override
    public void onSuccess(
            SocialIdentity identity,
            HttpServletRequest request,
            HttpServletResponse response
    ) throws IOException {
        SocialLoginResult result = socialLoginUseCase.login(identity);
        // 기존 연결을 조회하거나 배우 계정과 연결을 생성한 뒤 서비스 세션을 발급한다.
    }
}
```

이 구현은 code, state, nonce, PKCE, Provider Token 또는 Provider별 요청 형식을 알 필요가 없다. 회원 연결의 고유 키는 변경 가능한 이메일이 아니라 `(issuer, subject)`를 사용한다.

`SocialLoginSuccessHandler` Bean이 아직 없으면 Callback은 `501 Not Implemented`로 끝난다. 이는 Provider 인증 성공을 예술IN 로그인으로 오인하지 않도록 하는 안전장치다. 실제 서비스 배포 전에는 기존 연결 조회, 첫 로그인 배우 계정 자동 생성과 서비스 세션 발급을 반드시 연결해야 한다.

OAuth2 Authorized Client는 저장하지 않으며 성공 처리 직전에 Spring 인증 컨텍스트도 제거한다. 따라서 Provider Token이나 OIDC Principal이 예술IN 서비스 세션으로 남지 않는다.

## 검증

```bash
cd backend
./gradlew test
./gradlew checkstyleMain checkstyleTest
```

실제 Provider 검증은 백엔드를 실행한 뒤 `/oauth2/authorization/{provider}`를 브라우저에서 연다. 성공 Handler가 아직 없다면 Provider 인증 성공 후 `501`이 표시되는 것이 현재 모듈의 정상 종료다. 회원·세션 응답은 `SocialLoginSuccessHandler` 구현 후 확인한다.

## 공식 근거

- [Spring Security OAuth2 Login](https://docs.spring.io/spring-security/reference/servlet/oauth2/login/index.html)
- [Spring Security Authorization Code와 PKCE](https://docs.spring.io/spring-security/reference/servlet/oauth2/client/authorization-grants.html)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [카카오 로그인 REST API](https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api)
- [네이버 로그인 OIDC 가이드](https://developers.naver.com/docs/login/devguide/devguide.md)
- [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect)
