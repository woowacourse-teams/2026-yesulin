package art.yesulin.auth.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class EmailVerificationCodeTest {

    private static final Instant NOW = Instant.parse("2026-11-02T00:00:00Z");

    @Test
    void expiresExactlyAfterFiveMinutes() {
        // given
        EmailVerification verification = verification();
        // when, then
        assertThat(verification.isExpiredAt(NOW.plusSeconds(299))).isFalse();
        assertThat(verification.isExpiredAt(NOW.plusSeconds(300))).isTrue();
    }

    @Test
    void allowsFiveAttemptsAndThenRequiresNewCode() {
        // given
        EmailVerification verification = verification();
        // when
        EmailVerification failed = verification.withFailedAttempts(5);
        // then
        assertThat(verification.isAttemptLimitReached()).isFalse();
        assertThat(failed.isAttemptLimitReached()).isTrue();
    }

    @Test
    void allowsResendAfterOneMinute() {
        // given
        EmailVerification verification = verification();
        // when, then
        assertThat(verification.canResendAt(NOW.plusSeconds(59))).isFalse();
        assertThat(verification.canResendAt(NOW.plusSeconds(60))).isTrue();
    }

    private EmailVerification verification() {
        return EmailVerification.forCode("token", 1L, "producer@example.com", "hashed-code", NOW,
                Duration.ofMinutes(5));
    }
}
