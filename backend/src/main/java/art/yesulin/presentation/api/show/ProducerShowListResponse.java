package art.yesulin.presentation.api.show;

import art.yesulin.application.show.ProducerShowSummaryResult;
import art.yesulin.domain.show.ShowGenre;
import art.yesulin.domain.show.ShowStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.function.LongFunction;

public record ProducerShowListResponse(List<Item> shows) {

    static ProducerShowListResponse from(List<ProducerShowSummaryResult> results, LongFunction<String> urlReader) {
        return new ProducerShowListResponse(results.stream()
                .map(result -> new Item(
                        result.id(),
                        result.title(),
                        result.genre(),
                        urlReader.apply(result.posterFileId()),
                        result.status(),
                        result.sessionCount(),
                        result.reservedTickets(),
                        result.nextSessionStartsAt(),
                        result.createdAt()
                ))
                .toList());
    }

    public record Item(
            UUID id,
            String title,
            ShowGenre genre,
            String posterUrl,
            ShowStatus status,
            int sessionCount,
            long reservedTickets,
            Instant nextSessionStartsAt,
            Instant createdAt
    ) {
    }
}
