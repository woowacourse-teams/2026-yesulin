package art.yesulin.show.application;

import art.yesulin.show.domain.ShowGenre;
import java.time.Instant;
import java.util.UUID;

public record PublicShowSummaryResult(
        UUID id,
        long ownerId,
        String hostName,
        String title,
        ShowGenre genre,
        long posterFileId,
        String venueName,
        Instant nextSessionStartsAt,
        int runningMinutes
) {
}
