package art.yesulin.domain.audition;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class AuditionPublicationTest {

    @Test
    void publishesDraftAndKeepsFirstPublicationTimeOnRetry() {
        Audition audition = new Audition(
                1L,
                1L,
                "햄릿 오디션",
                new PerformancePeriod(LocalDate.of(2026, 10, 1), null)
        );
        Instant firstPublicationTime = Instant.parse("2026-09-01T00:00:00Z");

        audition.publish(firstPublicationTime);
        audition.publish(firstPublicationTime.plusSeconds(60));

        assertEquals(AuditionStatus.PUBLISHED, audition.getStatus());
        assertEquals(firstPublicationTime, audition.getPublishedAt());
    }

    @Test
    void nullPublicationTimeLeavesDraftUnchanged() {
        Audition audition = new Audition(
                1L,
                1L,
                "햄릿 오디션",
                new PerformancePeriod(LocalDate.of(2026, 10, 1), null)
        );

        assertThrows(IllegalArgumentException.class, () -> audition.publish(null));

        assertEquals(AuditionStatus.DRAFT, audition.getStatus());
        assertNull(audition.getPublishedAt());
    }
}
