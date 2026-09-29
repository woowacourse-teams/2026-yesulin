package art.yesulin.application.show;

import art.yesulin.domain.show.Show;
import art.yesulin.domain.show.ShowGenre;
import art.yesulin.domain.show.ShowSession;
import art.yesulin.domain.show.ShowStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ProducerShowResult(
        UUID id,
        long ownerId,
        String title,
        ShowGenre genre,
        String description,
        ShowVenueResult venue,
        int runningMinutes,
        String ageRating,
        String inquiryPhone,
        long posterFileId,
        List<Long> imageFileIds,
        List<ShowLinkResult> links,
        String directionsNote,
        boolean remainingSeatsVisible,
        ShowStatus status,
        boolean hasReservations,
        List<ProducerShowSessionResult> sessions,
        Instant createdAt
) {

    static ProducerShowResult of(Show show, List<ShowSession> sessions, SessionTickets tickets) {
        return new ProducerShowResult(
                show.getPublicId(),
                show.getOwnerId(),
                show.getTitle(),
                show.getGenre(),
                show.getDescription(),
                ShowVenueResult.from(show.getVenue()),
                show.getRunningMinutes(),
                show.getAgeRating(),
                show.getInquiryPhone(),
                show.getPosterFileId(),
                show.getImageFileIds(),
                show.getLinks().stream().map(ShowLinkResult::from).toList(),
                show.getDirectionsNote(),
                show.isRemainingSeatsVisible(),
                show.getStatus(),
                tickets.hasAnyReservations(),
                sessions.stream()
                        .map(session -> new ProducerShowSessionResult(
                                session.getId(),
                                session.getStartsAt(),
                                session.getCapacity(),
                                tickets.reserved(session),
                                tickets.hasReservations(session)
                        ))
                        .toList(),
                show.getCreatedAt()
        );
    }
}
