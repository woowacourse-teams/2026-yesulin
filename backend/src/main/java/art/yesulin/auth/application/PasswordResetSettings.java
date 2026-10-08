package art.yesulin.auth.application;

import java.net.URI;
import java.time.Duration;

public record PasswordResetSettings(
        Duration expiration,
        URI resetUrl
) {
}
