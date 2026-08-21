package art.yesulin.application.audition;

import art.yesulin.domain.audition.Audition;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record AuditionResult(
        UUID id,
        long performanceId,
        String title,
        LocalDate performanceStartDate,
        LocalDate performanceEndDate,
        boolean openRun,
        String status,
        Instant createdAt,
        Instant publishedAt
) {

    public static AuditionResult from(Audition audition) {
        return new AuditionResult(
                audition.getPublicId(),
                audition.getPerformanceId(),
                audition.getTitle(),
                audition.getPerformanceStartDate(),
                audition.getPerformanceEndDate(),
                audition.isOpenRun(),
                audition.getStatus().name(),
                audition.getCreatedAt(),
                audition.getPublishedAt()
        );
    }
}
