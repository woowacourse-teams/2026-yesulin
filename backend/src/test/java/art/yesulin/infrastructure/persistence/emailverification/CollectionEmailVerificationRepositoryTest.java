package art.yesulin.infrastructure.persistence.emailverification;

import static org.assertj.core.api.Assertions.assertThat;

import art.yesulin.domain.auth.EmailVerification;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class CollectionEmailVerificationRepositoryTest {

    private static final Instant NOW = Instant.parse("2026-08-26T00:00:00Z");

    private final CollectionEmailVerificationRepository repository =
            new CollectionEmailVerificationRepository();

    @Test
    void replacesPreviousVerificationForSameMember() {
        repository.save(verification("old", 1L, NOW.plusSeconds(60)), NOW);
        repository.save(verification("new", 1L, NOW.plusSeconds(120)), NOW);

        assertThat(repository.findByToken("old")).isEmpty();
        assertThat(repository.findByToken("new")).isPresent();
    }

    @Test
    void removesExpiredVerificationsWhenSaving() {
        repository.save(verification("expired", 1L, NOW), NOW.minusSeconds(1));
        repository.save(verification("valid", 2L, NOW.plusSeconds(60)), NOW);

        assertThat(repository.findByToken("expired")).isEmpty();
        assertThat(repository.findByToken("valid")).isPresent();
    }

    private EmailVerification verification(String token, long memberId, Instant expiresAt) {
        return new EmailVerification(token, memberId, "producer%d@yesulin.art".formatted(memberId), expiresAt);
    }
}
