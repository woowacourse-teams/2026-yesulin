package art.yesulin.dormant.presentation.api.screening;

import art.yesulin.dormant.application.screening.ScreeningApplicantResult;
import art.yesulin.dormant.application.screening.ScreeningBoardResult;
import art.yesulin.dormant.application.screening.ScreeningSubmissionDetailResult;
import java.util.List;

public record ScreeningSubmissionDetailResponse(
        ScreeningBoardResponse.Performance performance,
        ScreeningBoardResult.Posting posting,
        ScreeningBoardResult.Role role,
        int round,
        List<ScreeningBoardResult.Round> rounds,
        ScreeningApplicantResult submission
) {

    static ScreeningSubmissionDetailResponse from(ScreeningSubmissionDetailResult result, String posterUrl) {
        ScreeningBoardResult.Performance performance = result.performance();
        return new ScreeningSubmissionDetailResponse(
                new ScreeningBoardResponse.Performance(performance.id(), posterUrl, performance.title()),
                result.posting(), result.role(), result.round(), result.rounds(), result.submission()
        );
    }
}
