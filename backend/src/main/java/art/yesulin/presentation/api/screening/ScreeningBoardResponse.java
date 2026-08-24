package art.yesulin.presentation.api.screening;

import art.yesulin.application.screening.ScreeningApplicantResult;
import art.yesulin.application.screening.ScreeningBoardResult;
import java.util.List;

public record ScreeningBoardResponse(
        Performance performance,
        ScreeningBoardResult.Posting posting,
        ScreeningBoardResult.Role role,
        int round,
        List<ScreeningBoardResult.Round> rounds,
        List<ScreeningApplicantResult> submissions
) {

    static ScreeningBoardResponse from(ScreeningBoardResult result, String posterUrl) {
        ScreeningBoardResult.Performance performance = result.performance();
        return new ScreeningBoardResponse(
                new Performance(performance.id(), posterUrl, performance.title()), result.posting(), result.role(),
                result.round(), result.rounds(), result.submissions()
        );
    }

    public record Performance(long id, String posterUrl, String title) {
    }
}
