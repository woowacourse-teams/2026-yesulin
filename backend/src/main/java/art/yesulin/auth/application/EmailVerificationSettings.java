package art.yesulin.auth.application;

import java.net.URI;
import java.time.Duration;

public record EmailVerificationSettings(
        Duration expiration,
        URI verificationUrl,
        URI redirectUri
) {
}
