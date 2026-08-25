package art.yesulin.presentation.api.audition;

import art.yesulin.domain.audition.query.AuditionManagementResult;
import art.yesulin.domain.audition.query.ReviewProgressResult;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record AuditionManagementResponse(
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
        ReviewProgressResult progress
) {

    public static AuditionManagementResponse from(AuditionManagementResult result) {
        return new AuditionManagementResponse(
                result.id(), result.performanceId(), result.title(), result.performanceStartDate(),
                result.performanceEndDate(), result.openRun(), result.status(), result.createdAt(),
                result.publishedAt(), result.recruitmentStartAt(), result.recruitmentEndAt(), result.phase(),
                result.multipleRoleApplicationsAllowed(), result.roleCount(), result.quotaTotal(),
                result.applicantCount(), result.pendingReviewCount(), result.allRoundsClosed(), result.progress()
        );
    }
}
