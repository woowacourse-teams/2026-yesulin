package art.yesulin.presentation.api.submission;

import art.yesulin.application.submission.SubmittedSubmissionResult;
import java.util.UUID;

public record SubmitSubmissionResponse(UUID submissionId) {

    static SubmitSubmissionResponse from(SubmittedSubmissionResult result) {
        return new SubmitSubmissionResponse(result.submissionId());
    }
}
