package art.yesulin.application.auth;

import java.net.URI;
import java.time.Duration;

public record EmailVerificationSettings(
        Duration expiration,
        URI verificationUrl
) {
}
