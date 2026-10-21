package art.yesulin.event.application;

import art.yesulin.event.domain.Event;
import art.yesulin.event.domain.EventPhase;
import java.time.LocalDate;
import java.util.function.UnaryOperator;

/** 이벤트 목록 카드. */
public record PublicEventSummaryResult(
        long id,
        String title,
        String summary,
        LocalDate startsOn,
        LocalDate endsOn,
        EventPhase phase,
        String coverImageUrl
) {

    static PublicEventSummaryResult from(Event event, UnaryOperator<String> urlOf, LocalDate today) {
        return new PublicEventSummaryResult(
                event.getId(),
                event.getTitle(),
                event.getSummary(),
                event.getStartsOn(),
                event.getEndsOn(),
                event.phaseOn(today),
                urlOf.apply(event.getCoverImageKey())
        );
    }
}
