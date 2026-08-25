package art.yesulin.presentation.api.submission;

import java.util.List;

public record ApplicantSubmissionListResponse(List<ApplicantSubmissionSummaryResponse> submissions) {

    public ApplicantSubmissionListResponse {
        submissions = List.copyOf(submissions);
    }
}
