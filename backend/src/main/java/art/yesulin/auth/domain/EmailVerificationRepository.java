package art.yesulin.auth.domain;

import java.time.Instant;
import java.util.Optional;

public interface EmailVerificationRepository {

    void save(EmailVerification verification, Instant now);

    Optional<EmailVerification> findByToken(String token);

    Optional<EmailVerification> removeByToken(String token);

    Optional<EmailVerification> findByMemberId(long memberId);

    void recordFailure(String token);
}
