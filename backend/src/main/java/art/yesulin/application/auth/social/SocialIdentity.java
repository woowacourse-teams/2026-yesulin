package art.yesulin.application.auth.social;

import java.net.URI;

public record SocialIdentity(
        SocialProvider provider,
        URI issuer,
        String subject
) {

    public SocialIdentity {
        if (provider == null || issuer == null || subject == null || subject.isBlank()) {
            throw new IllegalArgumentException("Social provider, issuer, and subject are required");
        }
    }
}
