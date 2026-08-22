package art.yesulin.presentation.api.screening;

import art.yesulin.application.screening.ScreeningApplicantResult;
import art.yesulin.application.screening.ScreeningBoardResult;
import art.yesulin.application.screening.ScreeningPostingResult;
import art.yesulin.application.screening.ScreeningRoleResult;
import art.yesulin.application.screening.ScreeningRoundResult;
import java.util.List;

public record ScreeningBoardResponse(
        ScreeningPerformanceResponse performance,
        ScreeningPostingResult posting,
        ScreeningRoleResult role,
        int round,
        List<ScreeningRoundResult> rounds,
        List<ScreeningApplicantResult> submissions
) {

    static ScreeningBoardResponse from(ScreeningBoardResult result, String posterUrl) {
        return new ScreeningBoardResponse(
                ScreeningPerformanceResponse.from(result.performance(), posterUrl),
                result.posting(),
                result.role(),
                result.round(),
                result.rounds(),
                result.submissions()
        );
    }
}
