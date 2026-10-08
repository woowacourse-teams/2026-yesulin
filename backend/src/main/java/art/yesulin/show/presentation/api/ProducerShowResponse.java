package art.yesulin.show.presentation.api;

import art.yesulin.show.application.ProducerShowResult;
import art.yesulin.show.application.ProducerShowSessionResult;
import art.yesulin.show.application.ShowGuideResult;
import art.yesulin.show.application.ShowLinkResult;
import art.yesulin.show.application.ShowVenueResult;
import art.yesulin.show.domain.ShowGenre;
import art.yesulin.show.domain.ShowStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.function.LongFunction;

public record ProducerShowResponse(
        UUID id,
        String title,
        ShowGenre genre,
        String description,
        ShowVenueResult venue,
        int runningMinutes,
        String ageRating,
        String inquiryPhone,
        String hostName,
        String defaultHostName,
        List<ShowLinkResult> links,
        List<ShowGuideResult> guides,
        boolean remainingSeatsVisible,
        String externalReservationUrl,
        long externalReservationVisits,
        ShowImageResponse poster,
        List<ShowImageResponse> images,
        ShowStatus status,
        boolean hasReservations,
        List<ProducerShowSessionResult> sessions,
        Instant createdAt
) {

    static ProducerShowResponse from(ProducerShowResult result, LongFunction<String> urlReader) {
        return new ProducerShowResponse(
                result.id(),
                result.title(),
                result.genre(),
                result.description(),
                result.venue(),
                result.runningMinutes(),
                result.ageRating(),
                result.inquiryPhone(),
                result.hostName(),
                result.defaultHostName(),
                result.links(),
                result.guides(),
                result.remainingSeatsVisible(),
                result.externalReservationUrl(),
                result.externalReservationVisits(),
                new ShowImageResponse(result.posterFileId(), urlReader.apply(result.posterFileId())),
                result.imageFileIds().stream()
                        .map(fileId -> new ShowImageResponse(fileId, urlReader.apply(fileId)))
                        .toList(),
                result.status(),
                result.hasReservations(),
                result.sessions(),
                result.createdAt()
        );
    }
}
