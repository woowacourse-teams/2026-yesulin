package art.yesulin.infrastructure.oauth;

import art.yesulin.application.auth.social.SocialIdentity;
import art.yesulin.application.auth.social.SocialProvider;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.endpoint.RestClientAuthorizationCodeTokenResponseClient;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistration.ClientSettings;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableConfigurationProperties(SocialLoginProperties.class)
@ConditionalOnProperty(
        prefix = "yesulin.social-login",
        name = "enabled",
        havingValue = "true",
        matchIfMissing = true
)
public class SocialLoginConfiguration {

    private static final String REDIRECT_URI = "{baseUrl}/login/oauth2/code/{registrationId}";
    private static final String SECURITY_CONTEXT_SESSION_ATTRIBUTE = "SPRING_SECURITY_CONTEXT";

    @Bean
    public ClientRegistrationRepository clientRegistrationRepository(SocialLoginProperties properties) {
        validate(properties);
        List<ClientRegistration> registrations = new ArrayList<>();
        String redirectUri = resolveRedirectUri(properties);
        for (SocialProvider provider : SocialProvider.values()) {
            registrations.add(toClientRegistration(
                    provider,
                    properties.providers().get(provider),
                    redirectUri
            ));
        }
        return new InMemoryClientRegistrationRepository(registrations);
    }

    @Bean
    @Order(1)
    public SecurityFilterChain socialLoginSecurityFilterChain(
            HttpSecurity http,
            ClientRegistrationRepository registrations,
            ObjectProvider<SocialLoginSuccessHandler> successHandlerProvider
    ) throws Exception {
        NaverAuthorizationRequestResolver authorizationRequestResolver =
                new NaverAuthorizationRequestResolver(registrations);
        RestClientAuthorizationCodeTokenResponseClient tokenResponseClient = naverCompatibleTokenResponseClient();
        SocialLoginSuccessHandler successHandler = successHandlerProvider.getIfAvailable();
        SocialIdentityResolver identityResolver = new SocialIdentityResolver();

        http.securityMatcher("/oauth2/**", "/login/oauth2/**")
                .authorizeHttpRequests(authorize -> authorize.anyRequest().permitAll())
                .oauth2Login(oauth2 -> {
                    oauth2.authorizedClientRepository(new NonPersistingAuthorizedClientRepository());
                    oauth2.authorizationEndpoint(endpoint -> endpoint
                            .authorizationRequestResolver(authorizationRequestResolver));
                    oauth2.tokenEndpoint(endpoint -> endpoint
                            .accessTokenResponseClient(tokenResponseClient));
                    oauth2.successHandler((request, response, authentication) -> {
                        final SocialIdentity identity = identityResolver.resolve(authentication);
                        SecurityContextHolder.clearContext();
                        request.getSession().removeAttribute(SECURITY_CONTEXT_SESSION_ATTRIBUTE);
                        if (successHandler == null) {
                            response.sendError(501, "Social login success handler is not configured");
                            return;
                        }
                        successHandler.onSuccess(identity, request, response);
                    });
                })
                .csrf(Customizer.withDefaults());
        return http.build();
    }

    private RestClientAuthorizationCodeTokenResponseClient naverCompatibleTokenResponseClient() {
        RestClientAuthorizationCodeTokenResponseClient client =
                new RestClientAuthorizationCodeTokenResponseClient();
        client.addParametersConverter(new NaverTokenRequestParametersConverter());
        return client;
    }

    private ClientRegistration toClientRegistration(
            SocialProvider provider,
            SocialLoginProperties.Provider properties,
            String redirectUri
    ) {
        String registrationId = provider.name().toLowerCase();
        return ClientRegistration.withRegistrationId(registrationId)
                .clientName(provider.name())
                .clientId(properties.clientId())
                .clientSecret(properties.clientSecret())
                .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_POST)
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri(redirectUri)
                .scope("openid")
                .issuerUri(properties.issuer().toString())
                .authorizationUri(properties.authorizationUri().toString())
                .tokenUri(properties.tokenUri().toString())
                .jwkSetUri(properties.jwkSetUri().toString())
                .clientSettings(ClientSettings.builder().requireProofKey(true).build())
                .build();
    }

    private String resolveRedirectUri(SocialLoginProperties properties) {
        String configuredRedirectUri = properties.redirectUri();
        if (configuredRedirectUri == null || configuredRedirectUri.isBlank()) {
            return REDIRECT_URI;
        }
        if (!configuredRedirectUri.contains("{registrationId}")) {
            throw new IllegalStateException("Social login redirect URI must contain {registrationId}");
        }
        return configuredRedirectUri;
    }

    private void validate(SocialLoginProperties properties) {
        Map<SocialProvider, SocialLoginProperties.Provider> providers = properties.providers();
        if (providers == null) {
            throw new IllegalStateException("Social login provider settings are required");
        }
        for (SocialProvider provider : SocialProvider.values()) {
            validateProvider(provider, providers.get(provider));
        }
    }

    private void validateProvider(SocialProvider provider, SocialLoginProperties.Provider properties) {
        if (properties == null
                || !isHttps(properties.issuer())
                || !isHttps(properties.authorizationUri())
                || !isHttps(properties.tokenUri())
                || !isHttps(properties.jwkSetUri())
                || properties.clientId() == null
                || properties.clientId().isBlank()
                || properties.clientSecret() == null
                || properties.clientSecret().isBlank()) {
            throw new IllegalStateException("Invalid social login settings: " + provider.name());
        }
    }

    private boolean isHttps(URI uri) {
        return uri != null && uri.isAbsolute() && "https".equalsIgnoreCase(uri.getScheme());
    }
}
