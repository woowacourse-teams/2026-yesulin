package art.yesulin.auth.infrastructure;

import jakarta.validation.constraints.NotNull;
import java.time.Duration;
import org.hibernate.validator.constraints.time.DurationMin;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties("yesulin.email-verification")
public record EmailVerificationProperties(@NotNull @DurationMin(nanos = 1) Duration expiration) {
}
