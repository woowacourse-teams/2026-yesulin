package art.yesulin.auth.domain;

import java.time.Instant;
import java.util.Optional;

public interface PasswordResetRepository {

    void save(PasswordReset passwordReset, Instant now);

    Optional<PasswordReset> findByToken(String token);

    Optional<PasswordReset> removeByToken(String token);
}
