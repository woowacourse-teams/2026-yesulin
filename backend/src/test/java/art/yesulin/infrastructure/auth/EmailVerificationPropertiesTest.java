package art.yesulin.infrastructure.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.time.Duration;
import org.junit.jupiter.api.Test;

class EmailVerificationPropertiesTest {

    @Test
    void requiresBothVerificationAndRedirectUrlsToBeAbsolute() {
        EmailVerificationProperties valid = new EmailVerificationProperties(
                Duration.ofMinutes(5),
                URI.create("https://api.yesulin.art/api/v1/auth/email-verifications"),
                URI.create("https://yesulin.art/producers")
        );
        EmailVerificationProperties invalidRedirect = new EmailVerificationProperties(
                Duration.ofMinutes(5),
                URI.create("https://api.yesulin.art/api/v1/auth/email-verifications"),
                URI.create("/producers")
        );

        assertThat(valid.isAbsoluteUrl()).isTrue();
        assertThat(invalidRedirect.isAbsoluteUrl()).isFalse();
    }
}
