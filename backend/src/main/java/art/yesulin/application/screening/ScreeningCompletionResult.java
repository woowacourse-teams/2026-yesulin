package art.yesulin.application.screening;

import art.yesulin.domain.screening.AuditionScreening;

public record ScreeningCompletionResult(
        int round,
        int acceptedCount,
        int unselectedCount,
        int promotedCount,
        Integer nextRound,
        boolean allRoundsClosed
) {

    static ScreeningCompletionResult from(int round, AuditionScreening.Completion completion) {
        return new ScreeningCompletionResult(
                round,
                completion.acceptedCount(),
                completion.unselectedCount(),
                completion.promotedCount(),
                completion.nextRound(),
                completion.allRoundsClosed()
        );
    }

    static ScreeningCompletionResult alreadyClosed(int round, boolean allRoundsClosed) {
        return new ScreeningCompletionResult(round, 0, 0, 0, null, allRoundsClosed);
    }
}
