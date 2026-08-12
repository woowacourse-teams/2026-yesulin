package art.yesulin.application.application;

import java.time.LocalDateTime;

public record ApplicantApplicationSummary(long id, long postingId, LocalDateTime submittedAt) {
}
