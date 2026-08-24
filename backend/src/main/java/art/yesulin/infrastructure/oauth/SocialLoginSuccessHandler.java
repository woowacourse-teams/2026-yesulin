package art.yesulin.infrastructure.oauth;

import art.yesulin.application.auth.social.SocialIdentity;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

@FunctionalInterface
public interface SocialLoginSuccessHandler {

    void onSuccess(
            SocialIdentity identity,
            HttpServletRequest request,
            HttpServletResponse response
    ) throws IOException, ServletException;
}
