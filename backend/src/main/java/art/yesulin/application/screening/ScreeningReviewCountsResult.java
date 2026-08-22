package art.yesulin.application.screening;

import art.yesulin.domain.screening.ScreeningReviewStatus;
import java.util.List;

public record ScreeningReviewCountsResult(
        int all,
        int pending,
        int done,
        int pass,
        int fail,
        int absent,
        int etc
) {

    static ScreeningReviewCountsResult from(List<ScreeningReviewStatus> statuses) {
        int pending = count(statuses, ScreeningReviewStatus.PENDING);
        int pass = count(statuses, ScreeningReviewStatus.PASS);
        int fail = count(statuses, ScreeningReviewStatus.FAIL);
        int absent = count(statuses, ScreeningReviewStatus.ABSENT);
        int etc = count(statuses, ScreeningReviewStatus.ETC);
        return new ScreeningReviewCountsResult(
                statuses.size(), pending, statuses.size() - pending, pass, fail, absent, etc
        );
    }

    private static int count(List<ScreeningReviewStatus> statuses, ScreeningReviewStatus target) {
        return (int) statuses.stream().filter(status -> status == target).count();
    }
}
