package art.yesulin.presentation.api.audition;

import art.yesulin.domain.audition.query.AuditionPhaseCountsResult;

public record AuditionPhaseCountsResponse(
        int all,
        int draft,
        int upcoming,
        int open,
        int recruitClosed,
        int finished
) {

    public static AuditionPhaseCountsResponse from(AuditionPhaseCountsResult result) {
        return new AuditionPhaseCountsResponse(
                result.all(), result.draft(), result.upcoming(), result.open(), result.recruitClosed(),
                result.finished()
        );
    }
}
