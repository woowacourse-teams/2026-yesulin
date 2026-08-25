package art.yesulin.domain.audition.query;

import java.util.List;

public record AuditionManagementListResult(
        List<AuditionManagementResult> auditions,
        AuditionPhaseCountsResult counts
) {

    public AuditionManagementListResult {
        auditions = List.copyOf(auditions);
    }

    public static AuditionManagementListResult from(
            List<AuditionManagementResult> auditions,
            AuditionSearchCondition condition
    ) {
        return new AuditionManagementListResult(
                auditions.stream().filter(condition::matches).toList(), AuditionPhaseCountsResult.from(auditions)
        );
    }
}
