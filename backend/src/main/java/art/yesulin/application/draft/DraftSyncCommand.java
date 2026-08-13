package art.yesulin.application.draft;

import java.time.Instant;

public record DraftSyncCommand(
        long postingId,
        String contentJson,
        Long expectedRevision,
        Instant clientModifiedAt) {
}
