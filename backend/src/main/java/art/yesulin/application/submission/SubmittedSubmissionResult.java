package art.yesulin.application.submission;

import art.yesulin.domain.submission.Submission;
import java.time.Instant;
import java.util.UUID;

public record SubmittedSubmissionResult(
        UUID submissionId,
        Instant submittedAt
) {

    static SubmittedSubmissionResult from(Submission submission) {
        return new SubmittedSubmissionResult(submission.getSubmissionId(), submission.getSubmittedAt());
    }
}
