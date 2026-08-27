package art.yesulin.infrastructure.persistence.emailverification;

import static org.assertj.core.api.Assertions.assertThat;

import art.yesulin.domain.auth.EmailVerification;
import art.yesulin.domain.auth.EmailVerificationRepository;
import art.yesulin.infrastructure.querydsl.QueryDslConfiguration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@DataJpaTest(properties = {
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.datasource.url=jdbc:h2:mem:email-verification;MODE=MySQL;DB_CLOSE_DELAY=-1"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({JpaEmailVerificationRepository.class, QueryDslConfiguration.class})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class JpaEmailVerificationRepositoryTest {

    private static final Instant NOW = Instant.parse("2026-08-26T00:00:00Z");

    @Autowired
    private EmailVerificationRepository repository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void replacesPreviousVerificationForSameMember() {
        long memberId = createMember();
        repository.save(verification("old", memberId, NOW.plusSeconds(60)), NOW);
        repository.save(verification("new", memberId, NOW.plusSeconds(120)), NOW);

        assertThat(repository.findByToken("old")).isEmpty();
        assertThat(repository.findByToken("new")).isPresent();
    }

    @Test
    void atomicallyReplacesVerificationForConcurrentSavesBySameMember() throws Exception {
        long memberId = createMember();
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);

        try (var executor = Executors.newFixedThreadPool(2)) {
            List<Future<?>> saves = List.of(
                    executor.submit(() -> saveAfterStart(
                            verification("first", memberId, NOW.plusSeconds(60)), ready, start
                    )),
                    executor.submit(() -> saveAfterStart(
                            verification("second", memberId, NOW.plusSeconds(60)), ready, start
                    ))
            );

            ready.await();
            start.countDown();
            for (Future<?> save : saves) {
                save.get();
            }
        }

        assertThat(List.of(repository.findByToken("first"), repository.findByToken("second")))
                .filteredOn(java.util.Optional::isPresent)
                .hasSize(1);
    }

    @Test
    void removesExpiredVerificationsWhenSaving() {
        long expiredMemberId = createMember();
        long validMemberId = createMember();
        repository.save(verification("expired", expiredMemberId, NOW), NOW.minusSeconds(1));
        repository.save(verification("valid", validMemberId, NOW.plusSeconds(60)), NOW);

        assertThat(repository.findByToken("expired")).isEmpty();
        assertThat(repository.findByToken("valid")).isPresent();
    }

    @Test
    void removesVerificationByToken() {
        repository.save(verification("one-time", createMember(), NOW.plusSeconds(60)), NOW);

        assertThat(repository.removeByToken("one-time")).isPresent();
        assertThat(repository.findByToken("one-time")).isEmpty();
    }

    private EmailVerification verification(String token, long memberId, Instant expiresAt) {
        return new EmailVerification(token, memberId, "producer%d@yesulin.art".formatted(memberId), expiresAt);
    }

    private long createMember() {
        String email = "producer-%s@yesulin.art".formatted(UUID.randomUUID());
        jdbcTemplate.update("""
                insert into members (email, password_hash, type, status, created_at)
                values (?, ?, ?, ?, ?)
                """, email, "password", "PRODUCER", "PENDING", NOW);
        return jdbcTemplate.queryForObject("select id from members where email = ?", Long.class, email);
    }

    private void saveAfterStart(EmailVerification verification, CountDownLatch ready, CountDownLatch start) {
        ready.countDown();
        try {
            start.await();
            repository.save(verification, NOW);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(exception);
        }
    }
}
