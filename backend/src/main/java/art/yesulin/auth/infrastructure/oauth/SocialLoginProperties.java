package art.yesulin.auth.infrastructure.oauth;

import art.yesulin.auth.application.social.SocialProvider;
import java.net.URI;
import java.util.Map;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("yesulin.social-login")
public record SocialLoginProperties(
        boolean enabled,
        String redirectUri,
        URI failureRedirect,
        Map<SocialProvider, Provider> providers
) {

    public record Provider(
            URI issuer,
            URI authorizationUri,
            URI tokenUri,
            URI jwkSetUri,
            String clientId,
            String clientSecret
    ) {
    }
}
