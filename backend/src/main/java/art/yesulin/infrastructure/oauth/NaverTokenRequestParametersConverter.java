package art.yesulin.infrastructure.oauth;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.oauth2.client.endpoint.OAuth2AuthorizationCodeGrantRequest;
import org.springframework.security.oauth2.core.endpoint.OAuth2ParameterNames;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

final class NaverTokenRequestParametersConverter implements
        Converter<OAuth2AuthorizationCodeGrantRequest, MultiValueMap<String, String>> {

    private static final String NAVER = "naver";

    @Override
    public MultiValueMap<String, String> convert(OAuth2AuthorizationCodeGrantRequest request) {
        MultiValueMap<String, String> parameters = new LinkedMultiValueMap<>();
        if (NAVER.equals(request.getClientRegistration().getRegistrationId())) {
            parameters.set(
                    OAuth2ParameterNames.STATE,
                    request.getAuthorizationExchange().getAuthorizationRequest().getState()
            );
        }
        return parameters;
    }
}
