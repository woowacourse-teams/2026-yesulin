package art.yesulin.application.application;

import java.time.Instant;

public record ApplicantApplicationDetail(
        long id,
        long postingId,
        Instant submittedAt,
        String snapshotSchemaVersion,
        String snapshotJson) {
}
