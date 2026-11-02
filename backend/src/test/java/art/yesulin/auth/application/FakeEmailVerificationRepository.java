package art.yesulin.auth.application;

import art.yesulin.auth.domain.EmailVerification;
import art.yesulin.auth.domain.EmailVerificationRepository;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

class FakeEmailVerificationRepository implements EmailVerificationRepository {

    private final Map<String, EmailVerification> verifications = new HashMap<>();

    @Override
    public void save(EmailVerification verification, Instant now) {
        verifications.values().removeIf(current -> current.memberId() == verification.memberId());
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

    public Optional<EmailVerification> findByMemberId(long memberId) {
        return verifications.values().stream().filter(current -> current.memberId() == memberId).findFirst();
    }

    @Override
    public Optional<Long> findMemberIdByToken(String token) {
        return findByToken(token).map(EmailVerification::memberId);
    }

    public void recordFailure(String token) {
        EmailVerification verification = verifications.get(token);
        verifications.put(token, verification.withFailedAttempts(verification.failedAttempts() + 1));
    }

    void setFailedAttempts(long memberId, int attempts) {
        EmailVerification verification = findByMemberId(memberId).orElseThrow();
        verifications.put(verification.token(), verification.withFailedAttempts(attempts));
    }
}
