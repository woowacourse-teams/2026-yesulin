package art.yesulin.application.screening;

import art.yesulin.domain.screening.ScreeningReview;
import art.yesulin.domain.screening.ScreeningRound;
import java.util.UUID;

public record ScreeningReviewResult(
        UUID submissionId,
        long roleId,
        int round,
        String status,
        String memo,
        String note
) {

    static ScreeningReviewResult from(ScreeningReview review, ScreeningRound round) {
        return new ScreeningReviewResult(
                review.getSubmissionId(),
                review.getAuditionRoleId(),
                round.value(),
                review.getStatus().name(),
                review.getOtherReason(),
                review.getInternalMemo()
        );
    }
}
