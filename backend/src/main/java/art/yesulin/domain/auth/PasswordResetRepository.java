package art.yesulin.domain.auth;

import java.time.Instant;
import java.util.Optional;

public interface PasswordResetRepository {

    void save(PasswordReset passwordReset, Instant now);

    Optional<PasswordReset> findByToken(String token);

    Optional<PasswordReset> removeByToken(String token);
}
