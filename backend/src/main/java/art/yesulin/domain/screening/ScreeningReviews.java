package art.yesulin.domain.screening;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class ScreeningReviews {

    private final Map<UUID, ScreeningReview> values = new HashMap<>();

    public ScreeningReviews(List<ScreeningReview> reviews) {
        reviews.forEach(review -> values.put(review.getSubmissionId(), review));
    }

    public List<ScreeningReview> apply(
            List<UUID> submissionIds,
            long roleId,
            long stageId,
            ScreeningReviewChange change
    ) {
        return submissionIds.stream().map(id -> apply(id, roleId, stageId, change)).toList();
    }

    private ScreeningReview apply(UUID submissionId, long roleId, long stageId, ScreeningReviewChange change) {
        ScreeningReview review = values.computeIfAbsent(submissionId, id -> new ScreeningReview(id, roleId, stageId));
        review.apply(change);
        return review;
    }
}
