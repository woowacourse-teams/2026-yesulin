package art.yesulin.presentation.screening;

import art.yesulin.application.screening.ScreeningReviewCommand;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Positive;
import java.util.List;

public record ScreeningReviewRequest(
        @NotEmpty List<@Positive Long> applicationIds,
        String status,
        String memo,
        String note) {

    ScreeningReviewCommand toCommand(long roleId, int round) {
        return new ScreeningReviewCommand(
                roleId, round, applicationIds, status, memo, note);
    }
}
