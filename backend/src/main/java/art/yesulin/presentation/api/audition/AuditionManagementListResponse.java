package art.yesulin.presentation.api.audition;

import art.yesulin.domain.audition.query.AuditionManagementListResult;
import java.util.List;

public record AuditionManagementListResponse(
        List<AuditionManagementResponse> auditions,
        AuditionPhaseCountsResponse counts
) {

    public AuditionManagementListResponse {
        auditions = List.copyOf(auditions);
    }

    public static AuditionManagementListResponse from(AuditionManagementListResult result) {
        return new AuditionManagementListResponse(
                result.auditions().stream().map(AuditionManagementResponse::from).toList(),
                AuditionPhaseCountsResponse.from(result.counts())
        );
    }
}
