package art.yesulin.domain.audition;

import static org.junit.jupiter.api.Assertions.assertEquals;

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
}
