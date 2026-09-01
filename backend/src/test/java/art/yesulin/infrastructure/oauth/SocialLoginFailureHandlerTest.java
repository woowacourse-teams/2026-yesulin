package art.yesulin.infrastructure.oauth;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;

class SocialLoginFailureHandlerTest {

    @Test
    void redirectsToConfiguredFrontendUrl() throws Exception {
        URI failureRedirect = URI.create("https://yesulin.art/login?socialLoginError=true");
        SocialLoginFailureHandler handler = new SocialLoginFailureHandler(failureRedirect);
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.onAuthenticationFailure(
                new MockHttpServletRequest(),
                response,
                new OAuth2AuthenticationException(new OAuth2Error("authorization_request_not_found"))
        );

        assertThat(response.getRedirectedUrl()).isEqualTo(failureRedirect.toString());
    }
}
