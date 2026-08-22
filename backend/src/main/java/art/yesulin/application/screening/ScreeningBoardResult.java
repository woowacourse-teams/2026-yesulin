package art.yesulin.application.screening;

import java.util.List;

public record ScreeningBoardResult(
        ScreeningPerformanceResult performance,
        ScreeningPostingResult posting,
        ScreeningRoleResult role,
        int round,
        List<ScreeningRoundResult> rounds,
        List<ScreeningApplicantResult> submissions
) {

    public ScreeningBoardResult {
        rounds = List.copyOf(rounds);
        submissions = List.copyOf(submissions);
    }
}
