package art.yesulin.application.screening;

import java.util.List;

public record ScreeningReviewCommand(
        long roleId,
        int round,
        List<Long> applicationIds,
        String status,
        String memo,
        String note) {

    public ScreeningReviewCommand {
        applicationIds = List.copyOf(applicationIds);
    }
}
