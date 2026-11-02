package art.yesulin.auth.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import java.time.Duration;
import org.junit.jupiter.api.Test;

class EmailVerificationPropertiesTest {

    @Test
    void requiresPositiveExpirationWithoutRedirectSettings() {
        // given
        try (ValidatorFactory factory = Validation.buildDefaultValidatorFactory()) {
            Validator validator = factory.getValidator();
            // when, then
            assertThat(validator.validate(new EmailVerificationProperties(Duration.ofMinutes(5)))).isEmpty();
            assertThat(validator.validate(new EmailVerificationProperties(Duration.ZERO))).isNotEmpty();
        }
    }
}
