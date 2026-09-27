package art.yesulin.application.show;

import art.yesulin.domain.show.ShowGenre;
import java.time.Instant;
import java.util.UUID;

public record PublicShowSummaryResult(
        UUID id,
        long ownerId,
        String title,
        ShowGenre genre,
        long posterFileId,
        String venueName,
        Instant nextSessionStartsAt,
        int runningMinutes
) {
}
