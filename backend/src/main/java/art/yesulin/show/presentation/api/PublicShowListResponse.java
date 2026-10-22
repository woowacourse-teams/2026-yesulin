package art.yesulin.show.presentation.api;

import art.yesulin.show.application.PublicShowSummaryResult;
import art.yesulin.show.domain.ShowGenre;
import art.yesulin.show.domain.ShowStatus;
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
                        result.status(),
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
            ShowStatus status,
            String posterUrl,
            String venueName,
            Instant nextSessionStartsAt,
            int runningMinutes
    ) {
    }
}
