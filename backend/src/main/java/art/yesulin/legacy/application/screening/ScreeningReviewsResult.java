package art.yesulin.legacy.application.screening;

import art.yesulin.legacy.domain.screening.ScreeningReview;
import art.yesulin.legacy.domain.screening.ScreeningRound;
import java.util.List;

public record ScreeningReviewsResult(long roleId, int round, List<ScreeningReviewResult> reviews) {

    public ScreeningReviewsResult {
        reviews = List.copyOf(reviews);
    }

    static ScreeningReviewsResult from(long roleId, ScreeningRound round, List<ScreeningReview> reviews) {
        List<ScreeningReviewResult> results = reviews.stream()
                .map(review -> ScreeningReviewResult.from(review, round))
                .toList();
        return new ScreeningReviewsResult(roleId, round.value(), results);
    }
}
