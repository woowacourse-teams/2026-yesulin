package art.yesulin.infrastructure.oauth;

import art.yesulin.application.auth.social.SocialIdentity;
import art.yesulin.application.auth.social.SocialProvider;
import java.net.URI;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;

final class SocialIdentityResolver {

    public SocialIdentity resolve(Authentication authentication) {
        if (!(authentication instanceof OAuth2AuthenticationToken oauth2Authentication)) {
            throw new IllegalArgumentException("OAuth2 authentication is required");
        }
        if (!(oauth2Authentication.getPrincipal() instanceof OidcUser oidcUser)) {
            throw new IllegalArgumentException("OIDC principal is required");
        }

        SocialProvider provider = SocialProvider.fromRegistrationId(
                oauth2Authentication.getAuthorizedClientRegistrationId()
        );
        URI issuer = URI.create(oidcUser.getIdToken().getIssuer().toString());
        return new SocialIdentity(provider, issuer, oidcUser.getSubject());
    }
}
