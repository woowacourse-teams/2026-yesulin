package art.yesulin.application.screening;

import java.util.List;

public record ScreeningSubmissionDetailResult(
        ScreeningBoardResult.Performance performance,
        ScreeningBoardResult.Posting posting,
        ScreeningBoardResult.Role role,
        int round,
        List<ScreeningBoardResult.Round> rounds,
        ScreeningApplicantResult submission
) {

    public ScreeningSubmissionDetailResult {
        rounds = List.copyOf(rounds);
    }
}
