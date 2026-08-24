package art.yesulin.infrastructure.oauth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import art.yesulin.application.auth.social.SocialIdentity;
import art.yesulin.application.auth.social.SocialProvider;
import java.net.URI;
import java.time.Instant;
import java.util.Collections;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;

class SocialIdentityResolverTest {

    private final SocialIdentityResolver resolver = new SocialIdentityResolver();

    @Test
    void convertsVerifiedOidcAuthenticationToCommonIdentity() {
        Instant now = Instant.now();
        OidcIdToken idToken = new OidcIdToken(
                "id-token",
                now,
                now.plusSeconds(300),
                Map.of("iss", "https://kauth.kakao.com", "sub", "provider-user-id")
        );
        DefaultOidcUser oidcUser = new DefaultOidcUser(Collections.emptyList(), idToken);
        OAuth2AuthenticationToken authentication = new OAuth2AuthenticationToken(
                oidcUser,
                Collections.emptyList(),
                "kakao"
        );

        SocialIdentity identity = resolver.resolve(authentication);

        assertThat(identity.provider()).isEqualTo(SocialProvider.KAKAO);
        assertThat(identity.issuer()).isEqualTo(URI.create("https://kauth.kakao.com"));
        assertThat(identity.subject()).isEqualTo("provider-user-id");
    }

    @Test
    void rejectsNonOidcAuthentication() {
        TestingAuthenticationToken authentication = new TestingAuthenticationToken("user", "password");

        assertThatThrownBy(() -> resolver.resolve(authentication))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("OAuth2 authentication is required");
    }
}
