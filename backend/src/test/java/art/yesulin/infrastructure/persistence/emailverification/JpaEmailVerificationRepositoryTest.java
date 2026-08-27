package art.yesulin.infrastructure.persistence.emailverification;

import static org.assertj.core.api.Assertions.assertThat;

import art.yesulin.domain.auth.EmailVerification;
import art.yesulin.domain.auth.EmailVerificationRepository;
import art.yesulin.infrastructure.querydsl.QueryDslConfiguration;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;

@DataJpaTest(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@Import({JpaEmailVerificationRepository.class, QueryDslConfiguration.class})
class JpaEmailVerificationRepositoryTest {

    private static final Instant NOW = Instant.parse("2026-08-26T00:00:00Z");

    @Autowired
    private EmailVerificationRepository repository;

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

    @Test
    void removesVerificationByToken() {
        repository.save(verification("one-time", 1L, NOW.plusSeconds(60)), NOW);

        assertThat(repository.removeByToken("one-time")).isPresent();
        assertThat(repository.findByToken("one-time")).isEmpty();
    }

    private EmailVerification verification(String token, long memberId, Instant expiresAt) {
        return new EmailVerification(token, memberId, "producer%d@yesulin.art".formatted(memberId), expiresAt);
    }
}
