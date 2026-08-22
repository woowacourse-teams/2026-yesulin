package art.yesulin.application.screening;

public record ScreeningReviewProgressResult(int done, int total, int percent) {

    static ScreeningReviewProgressResult from(ScreeningReviewCountsResult counts) {
        int percent = counts.all() == 0 ? 0 : Math.round((float) counts.done() / counts.all() * 100);
        return new ScreeningReviewProgressResult(counts.done(), counts.all(), percent);
    }
}
