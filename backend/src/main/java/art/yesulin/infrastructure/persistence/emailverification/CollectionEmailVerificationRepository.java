package art.yesulin.infrastructure.persistence.emailverification;

import art.yesulin.domain.auth.EmailVerification;
import art.yesulin.domain.auth.EmailVerificationRepository;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Repository;

@Repository
public class CollectionEmailVerificationRepository implements EmailVerificationRepository {

    private final Map<String, EmailVerification> verifications = new ConcurrentHashMap<>();

    @Override
    public void save(EmailVerification verification, Instant now) {
        verifications.entrySet().removeIf(entry ->
                entry.getValue().isExpiredAt(now) || entry.getValue().memberId() == verification.memberId());
        verifications.put(verification.token(), verification);
    }

    @Override
    public Optional<EmailVerification> findByToken(String token) {
        return Optional.ofNullable(verifications.get(token));
    }

    @Override
    public Optional<EmailVerification> removeByToken(String token) {
        return Optional.ofNullable(verifications.remove(token));
    }
}
