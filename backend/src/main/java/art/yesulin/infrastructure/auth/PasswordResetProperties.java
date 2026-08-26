package art.yesulin.infrastructure.auth;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import java.net.URI;
import java.time.Duration;
import org.hibernate.validator.constraints.time.DurationMin;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties("yesulin.password-reset")
public record PasswordResetProperties(
        @NotNull @DurationMin(nanos = 1) Duration expiration,
        @NotNull URI url
) {

    @AssertTrue(message = "비밀번호 재설정 URL은 절대 URL이어야 합니다.")
    public boolean isAbsoluteUrl() {
        return url == null || url.isAbsolute();
    }
}
