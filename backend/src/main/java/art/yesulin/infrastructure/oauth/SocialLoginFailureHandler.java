package art.yesulin.infrastructure.oauth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URI;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;

final class SocialLoginFailureHandler implements AuthenticationFailureHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(SocialLoginFailureHandler.class);
    private static final Pattern SAFE_ERROR_CODE = Pattern.compile("[A-Za-z0-9._-]{1,64}");
    private static final String FALLBACK_ERROR_CODE = "oauth2_authentication_failed";

    private final URI failureRedirect;

    SocialLoginFailureHandler(URI failureRedirect) {
        this.failureRedirect = failureRedirect;
    }

    @Override
    public void onAuthenticationFailure(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException exception
    ) throws IOException {
        LOGGER.atWarn()
                .addKeyValue("event", "SOCIAL_LOGIN_FAILURE")
                .addKeyValue("errorCode", safeErrorCode(exception))
                .log("소셜 로그인을 완료하지 못했습니다.");
        response.sendRedirect(failureRedirect.toString());
    }

    private String safeErrorCode(AuthenticationException exception) {
        if (!(exception instanceof OAuth2AuthenticationException oauthException)) {
            return FALLBACK_ERROR_CODE;
        }
        String errorCode = oauthException.getError().getErrorCode();
        if (errorCode == null || !SAFE_ERROR_CODE.matcher(errorCode).matches()) {
            return FALLBACK_ERROR_CODE;
        }
        return errorCode;
    }
}
