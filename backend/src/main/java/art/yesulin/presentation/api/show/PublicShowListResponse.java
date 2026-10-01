package art.yesulin.presentation.api.show;

import art.yesulin.application.show.PublicShowSummaryResult;
import art.yesulin.domain.show.ShowGenre;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.function.BiFunction;

public record PublicShowListResponse(List<Item> shows) {

    static PublicShowListResponse from(
            List<PublicShowSummaryResult> results,
            BiFunction<Long, Long, String> urlReader
    ) {
        return new PublicShowListResponse(results.stream()
                .map(result -> new Item(
                        result.id(),
                        result.hostName(),
                        result.title(),
                        result.genre(),
                        urlReader.apply(result.ownerId(), result.posterFileId()),
                        result.venueName(),
                        result.nextSessionStartsAt(),
                        result.runningMinutes()
                ))
                .toList());
    }

    public record Item(
            UUID id,
            String hostName,
            String title,
            ShowGenre genre,
            String posterUrl,
            String venueName,
            Instant nextSessionStartsAt,
            int runningMinutes
    ) {
    }
}
