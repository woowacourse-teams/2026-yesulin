package art.yesulin.application.application;

import java.time.Instant;

public record SubmissionResult(long applicationId, long postingId, Instant submittedAt) {
}
