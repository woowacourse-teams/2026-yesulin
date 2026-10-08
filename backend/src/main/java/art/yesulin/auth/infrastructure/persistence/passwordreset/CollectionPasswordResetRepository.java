package art.yesulin.auth.infrastructure.persistence.passwordreset;

import art.yesulin.auth.domain.PasswordReset;
import art.yesulin.auth.domain.PasswordResetRepository;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Repository;

@Repository
public class CollectionPasswordResetRepository implements PasswordResetRepository {

    private final Map<String, PasswordReset> passwordResets = new ConcurrentHashMap<>();

    @Override
    public void save(PasswordReset passwordReset, Instant now) {
        synchronized (passwordResets) {
            passwordResets.entrySet().removeIf(entry ->
                    entry.getValue().isExpiredAt(now)
                            || entry.getValue().memberId() == passwordReset.memberId());
            passwordResets.put(passwordReset.token(), passwordReset);
        }
    }

    @Override
    public Optional<PasswordReset> findByToken(String token) {
        return Optional.ofNullable(passwordResets.get(token));
    }

    @Override
    public Optional<PasswordReset> removeByToken(String token) {
        return Optional.ofNullable(passwordResets.remove(token));
    }
}
