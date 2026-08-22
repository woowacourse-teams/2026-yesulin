package art.yesulin.presentation.api.screening;

import art.yesulin.application.screening.ScreeningApplicantResult;
import art.yesulin.application.screening.ScreeningPostingResult;
import art.yesulin.application.screening.ScreeningRoleResult;
import art.yesulin.application.screening.ScreeningRoundResult;
import art.yesulin.application.screening.ScreeningSubmissionDetailResult;
import java.util.List;

public record ScreeningSubmissionDetailResponse(
        ScreeningPerformanceResponse performance,
        ScreeningPostingResult posting,
        ScreeningRoleResult role,
        int round,
        List<ScreeningRoundResult> rounds,
        ScreeningApplicantResult submission
) {

    static ScreeningSubmissionDetailResponse from(ScreeningSubmissionDetailResult result, String posterUrl) {
        return new ScreeningSubmissionDetailResponse(
                ScreeningPerformanceResponse.from(result.performance(), posterUrl),
                result.posting(),
                result.role(),
                result.round(),
                result.rounds(),
                result.submission()
        );
    }
}
