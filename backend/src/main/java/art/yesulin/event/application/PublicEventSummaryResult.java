package art.yesulin.event.application;

import art.yesulin.event.domain.Event;
import art.yesulin.event.domain.EventPhase;
import art.yesulin.event.domain.EventRegistrationStatus;
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
        String coverImageUrl,
        EventRegistrationStatus registrationStatus
) {

    static PublicEventSummaryResult from(
            Event event, UnaryOperator<String> urlOf, LocalDate today, long registrationCount
    ) {
        return new PublicEventSummaryResult(
                event.getId(),
                event.getTitle(),
                event.getSummary(),
                event.getStartsOn(),
                event.getEndsOn(),
                event.phaseOn(today),
                urlOf.apply(event.getCoverImageKey()),
                event.registrationStatusOn(today, registrationCount)
        );
    }
}
