package art.yesulin.domain.auth;

import java.time.Instant;
import java.util.Optional;

public interface EmailVerificationRepository {

    void save(EmailVerification verification, Instant now);

    Optional<EmailVerification> findByToken(String token);

    Optional<EmailVerification> removeByToken(String token);
}
