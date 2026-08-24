package art.yesulin.presentation.api.submission;

import art.yesulin.application.submission.SubmissionSummaryResult;
import java.util.List;

public record ApplicantSubmissionListResponse(List<SubmissionSummaryResult> submissions) {

    public ApplicantSubmissionListResponse {
        submissions = List.copyOf(submissions);
    }
}
