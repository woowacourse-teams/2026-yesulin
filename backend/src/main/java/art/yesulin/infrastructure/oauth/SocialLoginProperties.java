package art.yesulin.infrastructure.oauth;

import art.yesulin.application.auth.social.SocialProvider;
import java.net.URI;
import java.util.Map;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("yesulin.social-login")
public record SocialLoginProperties(
        boolean enabled,
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
