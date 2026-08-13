package art.yesulin.application.application;

import java.time.Instant;

public record ApplicantApplicationSummary(long id, long postingId, Instant submittedAt) {
}
