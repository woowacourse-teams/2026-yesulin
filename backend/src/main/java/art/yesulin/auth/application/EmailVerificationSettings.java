package art.yesulin.auth.application;

import java.time.Duration;

public record EmailVerificationSettings(Duration expiration) {
}
