package art.yesulin.application.screening;

import java.util.UUID;

public record ScreeningRoleResult(
        long id,
        UUID postingId,
        String name,
        String description,
        int quota,
        String gender,
        int ageMin,
        int ageMax,
        int applicantCount,
        int activeRound,
        boolean allRoundsClosed,
        ScreeningReviewProgressResult progress,
        ScreeningReviewCountsResult counts
) {
}
