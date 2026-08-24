package art.yesulin.infrastructure.oauth;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.oauth2.core.endpoint.OAuth2ParameterNames;
import org.springframework.security.oauth2.core.oidc.endpoint.OidcParameterNames;

final class NaverAuthorizationRequestResolver implements OAuth2AuthorizationRequestResolver {

    private static final String NAVER = "naver";

    private final DefaultOAuth2AuthorizationRequestResolver delegate;

    NaverAuthorizationRequestResolver(ClientRegistrationRepository registrations) {
        this.delegate = new DefaultOAuth2AuthorizationRequestResolver(registrations, "/oauth2/authorization");
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request) {
        return withoutUnsupportedNaverNonce(this.delegate.resolve(request));
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request, String registrationId) {
        return withoutUnsupportedNaverNonce(this.delegate.resolve(request, registrationId));
    }

    private OAuth2AuthorizationRequest withoutUnsupportedNaverNonce(OAuth2AuthorizationRequest authorizationRequest) {
        if (authorizationRequest == null || !isNaver(authorizationRequest.getAttributes())) {
            return authorizationRequest;
        }
        return OAuth2AuthorizationRequest.from(authorizationRequest)
                .attributes(attributes -> attributes.remove(OidcParameterNames.NONCE))
                .additionalParameters(parameters -> parameters.remove(OidcParameterNames.NONCE))
                .build();
    }

    private boolean isNaver(Map<String, Object> attributes) {
        return NAVER.equals(attributes.get(OAuth2ParameterNames.REGISTRATION_ID));
    }
}
