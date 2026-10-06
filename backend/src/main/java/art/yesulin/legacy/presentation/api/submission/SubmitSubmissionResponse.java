package art.yesulin.legacy.presentation.api.submission;

import art.yesulin.legacy.application.submission.SubmittedSubmissionResult;
import java.time.Instant;
import java.util.UUID;

public record SubmitSubmissionResponse(UUID submissionId, Instant submittedAt) {

    static SubmitSubmissionResponse from(SubmittedSubmissionResult result) {
        return new SubmitSubmissionResponse(result.submissionId(), result.submittedAt());
    }
}
