package art.yesulin.domain.admin.query;

import art.yesulin.domain.audition.AuditionStatus;
import java.time.Instant;
import java.util.UUID;

public record AdminAuditionRow(
        UUID auditionId,
        String title,
        AuditionStatus status,
        String companyName,
        String performanceTitle,
        Instant createdAt,
        Instant publishedAt,
        long submissionCount
) {
}
