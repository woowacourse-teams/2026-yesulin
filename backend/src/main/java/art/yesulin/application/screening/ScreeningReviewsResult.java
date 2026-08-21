package art.yesulin.application.screening;

import art.yesulin.domain.screening.ScreeningReview;
import java.util.List;

public record ScreeningReviewsResult(long roleId, int round, List<ScreeningReviewResult> reviews) {

    public ScreeningReviewsResult {
        reviews = List.copyOf(reviews);
    }

    static ScreeningReviewsResult from(ScreeningReviewTarget target, List<ScreeningReview> reviews) {
        List<ScreeningReviewResult> results = reviews.stream()
                .map(review -> ScreeningReviewResult.from(review, target.round()))
                .toList();
        return new ScreeningReviewsResult(target.roleId(), target.round().value(), results);
    }
}
