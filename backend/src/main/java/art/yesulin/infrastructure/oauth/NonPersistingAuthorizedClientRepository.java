package art.yesulin.infrastructure.oauth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizedClientRepository;

final class NonPersistingAuthorizedClientRepository implements OAuth2AuthorizedClientRepository {

    @Override
    public <T extends OAuth2AuthorizedClient> T loadAuthorizedClient(
            String clientRegistrationId,
            Authentication principal,
            HttpServletRequest request
    ) {
        return null;
    }

    @Override
    public void saveAuthorizedClient(
            OAuth2AuthorizedClient authorizedClient,
            Authentication principal,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
    }

    @Override
    public void removeAuthorizedClient(
            String clientRegistrationId,
            Authentication principal,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
    }
}
