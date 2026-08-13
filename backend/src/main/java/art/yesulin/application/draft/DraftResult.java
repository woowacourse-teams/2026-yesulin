package art.yesulin.application.draft;

import java.time.Instant;

public record DraftResult(
        long id,
        long postingId,
        String contentJson,
        long revision,
        Instant clientModifiedAt,
        Instant serverModifiedAt,
        String status) {
}
