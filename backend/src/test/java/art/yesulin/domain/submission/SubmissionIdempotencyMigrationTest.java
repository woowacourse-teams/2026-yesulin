package art.yesulin.domain.submission;

import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.support.ObjectStorageTestConfiguration;
import java.nio.ByteBuffer;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:submission-idempotency-migration;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=validate"
})
@Import(ObjectStorageTestConfiguration.class)
@Transactional
class SubmissionIdempotencyMigrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void rejectsDuplicateIdempotencyKeyForSameApplicant() {
        UUID idempotencyKey = UUID.randomUUID();
        insertRequest(1L, idempotencyKey);

        assertThrows(
                DataIntegrityViolationException.class,
                () -> insertRequest(1L, idempotencyKey)
        );
    }

    private void insertRequest(long applicantId, UUID idempotencyKey) {
        jdbcTemplate.update(
                """
                        insert into submission_idempotency_requests
                            (applicant_id, idempotency_key, request_hash, created_at)
                        values (?, ?, ?, ?)
                        """,
                applicantId,
                toBytes(idempotencyKey),
                "0".repeat(64),
                Timestamp.from(Instant.parse("2026-09-03T00:00:00Z"))
        );
    }

    private byte[] toBytes(UUID value) {
        return ByteBuffer.allocate(16)
                .putLong(value.getMostSignificantBits())
                .putLong(value.getLeastSignificantBits())
                .array();
    }
}
