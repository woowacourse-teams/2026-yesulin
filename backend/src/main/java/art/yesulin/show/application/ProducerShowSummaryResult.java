package art.yesulin.show.application;

import art.yesulin.show.domain.ShowGenre;
import art.yesulin.show.domain.ShowStatus;
import java.time.Instant;
import java.util.UUID;

public record ProducerShowSummaryResult(
        UUID id,
        long ownerId,
        String title,
        ShowGenre genre,
        long posterFileId,
        ShowStatus status,
        int sessionCount,
        long reservedTickets,
        Instant nextSessionStartsAt,
        Instant createdAt
) {
}
