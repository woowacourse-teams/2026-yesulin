package art.yesulin.application.screening;

public record ScreeningRoundResult(
        int round,
        String name,
        boolean open,
        boolean closed,
        ScreeningReviewCountsResult counts,
        ScreeningReviewProgressResult progress
) {

    static ScreeningRoundResult open(int round, String name, ScreeningReviewCountsResult counts) {
        return new ScreeningRoundResult(round, name, true, false, counts, ScreeningReviewProgressResult.from(counts));
    }
}
