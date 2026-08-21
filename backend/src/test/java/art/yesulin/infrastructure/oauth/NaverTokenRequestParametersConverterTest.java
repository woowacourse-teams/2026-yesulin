package art.yesulin.infrastructure.oauth;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.client.endpoint.OAuth2AuthorizationCodeGrantRequest;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationExchange;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationResponse;
import org.springframework.security.oauth2.core.endpoint.OAuth2ParameterNames;
import org.springframework.util.MultiValueMap;

class NaverTokenRequestParametersConverterTest {

    private final NaverTokenRequestParametersConverter converter =
            new NaverTokenRequestParametersConverter();

    @Test
    void addsStateOnlyToNaverTokenRequest() {
        MultiValueMap<String, String> naverParameters = converter.convert(grantRequest("naver"));
        MultiValueMap<String, String> googleParameters = converter.convert(grantRequest("google"));

        assertThat(naverParameters.getFirst(OAuth2ParameterNames.STATE)).isEqualTo("expected-state");
        assertThat(googleParameters).isEmpty();
    }

    private OAuth2AuthorizationCodeGrantRequest grantRequest(String registrationId) {
        OAuth2AuthorizationRequest authorizationRequest = OAuth2AuthorizationRequest.authorizationCode()
                .authorizationUri("https://provider.example/authorize")
                .clientId("client-id")
                .redirectUri("http://localhost:8080/login/oauth2/code/" + registrationId)
                .state("expected-state")
                .attributes(attributes -> attributes.putAll(Map.of()))
                .build();
        OAuth2AuthorizationResponse authorizationResponse = OAuth2AuthorizationResponse.success("code")
                .redirectUri("http://localhost:8080/login/oauth2/code/" + registrationId)
                .state("expected-state")
                .build();
        return new OAuth2AuthorizationCodeGrantRequest(
                clientRegistration(registrationId),
                new OAuth2AuthorizationExchange(authorizationRequest, authorizationResponse)
        );
    }

    private ClientRegistration clientRegistration(String registrationId) {
        return ClientRegistration.withRegistrationId(registrationId)
                .clientId("client-id")
                .clientSecret("client-secret")
                .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_POST)
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
                .authorizationUri("https://provider.example/authorize")
                .tokenUri("https://provider.example/token")
                .jwkSetUri("https://provider.example/jwks")
                .issuerUri("https://provider.example")
                .scope("openid")
                .build();
    }
}
