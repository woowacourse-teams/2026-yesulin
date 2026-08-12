package art.yesulin.application.application;

import java.time.LocalDateTime;

public record ApplicantApplicationDetail(
        long id,
        long postingId,
        LocalDateTime submittedAt,
        String snapshotSchemaVersion,
        String snapshotJson) {
}
