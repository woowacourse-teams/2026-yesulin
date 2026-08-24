package art.yesulin.infrastructure.oauth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import art.yesulin.application.auth.social.SocialProvider;
import java.net.URI;
import java.util.EnumMap;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.oauth2.core.endpoint.PkceParameterNames;
import org.springframework.security.oauth2.core.oidc.endpoint.OidcParameterNames;

class SocialLoginConfigurationTest {

    private SocialLoginConfiguration configuration;
    private ClientRegistrationRepository registrations;

    @BeforeEach
    void setUp() {
        configuration = new SocialLoginConfiguration();
        registrations = configuration.clientRegistrationRepository(validProperties());
    }

    @Test
    void createsThreeOidcClientsWithPkce() {
        for (SocialProvider provider : SocialProvider.values()) {
            ClientRegistration registration = registrations.findByRegistrationId(provider.name().toLowerCase());

            assertThat(registration).isNotNull();
            assertThat(registration.getScopes()).containsExactly("openid");
            assertThat(registration.getClientSettings().isRequireProofKey()).isTrue();
            assertThat(registration.getRedirectUri())
                    .isEqualTo("{baseUrl}/login/oauth2/code/{registrationId}");
        }
    }

    @Test
    void usesConfiguredRedirectUri() {
        String redirectUri = "http://localhost:3000/login/oauth2/code/{registrationId}";
        SocialLoginProperties properties = new SocialLoginProperties(
                true,
                redirectUri,
                validProviders()
        );

        ClientRegistrationRepository configured = configuration.clientRegistrationRepository(properties);

        assertThat(configured.findByRegistrationId("kakao").getRedirectUri()).isEqualTo(redirectUri);
    }

    @Test
    void keepsNonceForKakaoAndRemovesItForNaver() {
        NaverAuthorizationRequestResolver resolver = new NaverAuthorizationRequestResolver(registrations);

        OAuth2AuthorizationRequest kakao = resolver.resolve(requestFor("kakao"));
        OAuth2AuthorizationRequest naver = resolver.resolve(requestFor("naver"));

        assertThat(kakao.getAdditionalParameters()).containsKey(OidcParameterNames.NONCE);
        assertThat(naver.getAdditionalParameters()).doesNotContainKey(OidcParameterNames.NONCE);
        assertThat(naver.getAttributes()).doesNotContainKey(OidcParameterNames.NONCE);
        assertThat(naver.getAdditionalParameters()).containsKey(PkceParameterNames.CODE_CHALLENGE);
        assertThat(naver.getState()).isNotBlank();
    }

    @Test
    void rejectsMissingProviderConfiguration() {
        SocialLoginProperties properties = new SocialLoginProperties(true, "", Map.of());

        assertThatThrownBy(() -> configuration.clientRegistrationRepository(properties))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("KAKAO");
    }

    private MockHttpServletRequest requestFor(String registrationId) {
        MockHttpServletRequest request = new MockHttpServletRequest(
                "GET",
                "/oauth2/authorization/" + registrationId
        );
        request.setScheme("http");
        request.setServerName("localhost");
        request.setServerPort(8080);
        return request;
    }

    private SocialLoginProperties validProperties() {
        return new SocialLoginProperties(true, "", validProviders());
    }

    private Map<SocialProvider, SocialLoginProperties.Provider> validProviders() {
        Map<SocialProvider, SocialLoginProperties.Provider> providers = new EnumMap<>(SocialProvider.class);
        providers.put(SocialProvider.KAKAO, provider("kauth.kakao.com"));
        providers.put(SocialProvider.NAVER, provider("nid.naver.com"));
        providers.put(SocialProvider.GOOGLE, provider("accounts.google.com"));
        return providers;
    }

    private SocialLoginProperties.Provider provider(String host) {
        return new SocialLoginProperties.Provider(
                URI.create("https://" + host),
                URI.create("https://" + host + "/authorize"),
                URI.create("https://" + host + "/token"),
                URI.create("https://" + host + "/jwks"),
                "client-id",
                "client-secret"
        );
    }
}
