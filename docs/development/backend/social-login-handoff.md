# 로그인 담당자 인수인계

## 호출 경계

소셜 인증 시작 링크는 `/oauth2/authorization/kakao`, `/oauth2/authorization/naver`, `/oauth2/authorization/google`이다. Callback과 Provider 통신은 Spring Security가 처리한다.

로그인 담당자는 `SocialLoginSuccessHandler`를 구현하고 다음 값만 받는다.

```java
public record SocialIdentity(
        SocialProvider provider,
        URI issuer,
        String subject
) {
}
```

- 회원 연결 조회 키: `(issuer, subject)`
- `provider`: 화면 표시와 운영 구분용
- 이메일·이름·프로필: 소셜 인증 결과에 포함하지 않음
- Access Token·Refresh Token·ID Token: 로그인 기능에 전달하거나 저장하지 않음

## 성공 후 처리

```text
기존 소셜 계정 연결 존재
-> 회원 로그인 처리
-> 서비스 세션과 Secure·HttpOnly 쿠키 발급

연결 없음
-> 배우 계정과 소셜 계정 연결을 한 트랜잭션으로 자동 생성
-> 서비스 세션과 Secure·HttpOnly 쿠키 발급
```

배우는 별도 회원가입 API·화면을 두지 않는다. 첫 소셜 인증 성공 시 배우 계정과 소셜 계정 연결을 자동 생성하되, 프로필·지원서 정보는 기존 정책에 따라 별도로 입력·연결한다.

## 구현 예시

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
        // 기존 연결 조회 또는 배우 계정 자동 생성 후 서비스 세션 발급
    }
}
```

Provider 추가나 Endpoint 변경은 이 구현에 영향을 주지 않는다.

## 로그인 담당 체크리스트

- [ ] `(issuer, subject)` 복합 유일 제약과 조회를 구현한다.
- [ ] 연결이 없으면 배우 계정과 소셜 계정 연결을 한 DB 트랜잭션으로 자동 생성한다.
- [ ] 서비스 세션과 Secure·HttpOnly 쿠키를 발급한다.
- [ ] 성공·실패 Redirect와 원래 진입 경로 복원을 정한다.
- [ ] 민감한 인증 값이 URL·로그·예외에 남지 않게 한다.
