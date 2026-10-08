package art.yesulin.show.application;

import art.yesulin.show.domain.Show;
import art.yesulin.show.domain.ShowGenre;
import art.yesulin.show.domain.ShowSession;
import art.yesulin.show.domain.ShowStatus;
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
        String hostName,
        String defaultHostName,
        List<ShowLinkResult> links,
        List<ShowGuideResult> guides,
        boolean remainingSeatsVisible,
        String externalReservationUrl,
        long externalReservationVisits,
        ShowStatus status,
        boolean hasReservations,
        List<ProducerShowSessionResult> sessions,
        Instant createdAt
) {

    static ProducerShowResult of(
            Show show, String defaultHostName, List<ShowSession> sessions, SessionTickets tickets,
            long externalReservationVisits
    ) {
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
                show.getHostName(),
                defaultHostName,
                show.getLinks().stream().map(ShowLinkResult::from).toList(),
                show.getGuides().stream().map(ShowGuideResult::from).toList(),
                show.isRemainingSeatsVisible(),
                show.getExternalReservationUrl(),
                externalReservationVisits,
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
