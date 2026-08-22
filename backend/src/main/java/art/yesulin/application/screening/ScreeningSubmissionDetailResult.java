package art.yesulin.application.screening;

import java.util.List;

public record ScreeningSubmissionDetailResult(
        ScreeningPerformanceResult performance,
        ScreeningPostingResult posting,
        ScreeningRoleResult role,
        int round,
        List<ScreeningRoundResult> rounds,
        ScreeningApplicantResult submission
) {

    public ScreeningSubmissionDetailResult {
        rounds = List.copyOf(rounds);
    }
}
