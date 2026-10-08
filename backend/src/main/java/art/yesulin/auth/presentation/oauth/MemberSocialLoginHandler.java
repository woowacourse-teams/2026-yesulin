package art.yesulin.auth.presentation.oauth;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.social.SocialIdentity;
import art.yesulin.auth.application.social.SocialLoginService;
import art.yesulin.auth.infrastructure.oauth.SocialLoginSuccessHandler;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 소셜 인증이 끝나면 서비스 세션을 발급하고 화면으로 돌려보낸다.
 * 인증·인가 검사는 LoginRequiredInterceptor와 LoginMemberArgumentResolver가 담당한다.
 */
@Component
@RequiredArgsConstructor
public class MemberSocialLoginHandler implements SocialLoginSuccessHandler {

    private final SocialLoginService socialLoginService;

    @Value("${yesulin.social-login.success-redirect:/}")
    private String successRedirect;

    @Override
    public void onSuccess(
            SocialIdentity identity,
            HttpServletRequest request,
            HttpServletResponse response
    ) throws IOException {
        MemberPrincipal principal = socialLoginService.login(identity);

        HttpSession session = request.getSession(true);
        request.changeSessionId();
        session.setAttribute(MemberPrincipal.SESSION_ATTRIBUTE, principal);

        response.sendRedirect(successRedirect);
    }
}
