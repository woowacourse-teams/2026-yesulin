package art.yesulin.domain.audition.query;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record AuditionManagementResult(
        UUID id,
        long performanceId,
        String title,
        LocalDate performanceStartDate,
        LocalDate performanceEndDate,
        boolean openRun,
        String status,
        Instant createdAt,
        Instant publishedAt,
        Instant recruitmentStartAt,
        Instant recruitmentEndAt,
        String phase,
        boolean multipleRoleApplicationsAllowed,
        int roleCount,
        int quotaTotal,
        int applicantCount,
        int pendingReviewCount,
        boolean allRoundsClosed,
        ReviewProgressResult progress,
        List<AuditionRoleManagementResult> roles
) {

    public AuditionManagementResult {
        roles = List.copyOf(roles);
    }
}
