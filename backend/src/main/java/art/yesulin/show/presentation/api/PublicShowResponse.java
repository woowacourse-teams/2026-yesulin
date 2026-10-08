package art.yesulin.show.presentation.api;

import art.yesulin.show.application.PublicShowResult;
import art.yesulin.show.application.PublicShowSessionResult;
import art.yesulin.show.application.ShowGuideResult;
import art.yesulin.show.application.ShowLinkResult;
import art.yesulin.show.application.ShowVenueResult;
import art.yesulin.show.domain.ShowGenre;
import art.yesulin.show.domain.ShowStatus;
import java.util.List;
import java.util.UUID;
import java.util.function.LongFunction;

public record PublicShowResponse(
        UUID id,
        String hostName,
        String title,
        ShowGenre genre,
        String description,
        String posterUrl,
        List<String> imageUrls,
        ShowVenueResult venue,
        List<ShowGuideResult> guides,
        int runningMinutes,
        String ageRating,
        String inquiryPhone,
        List<ShowLinkResult> links,
        String externalReservationUrl,
        ShowStatus status,
        int maxTicketsPerReservation,
        List<PublicShowSessionResult> sessions
) {

    static PublicShowResponse from(PublicShowResult result, LongFunction<String> urlReader) {
        return new PublicShowResponse(
                result.id(),
                result.hostName(),
                result.title(),
                result.genre(),
                result.description(),
                urlReader.apply(result.posterFileId()),
                result.imageFileIds().stream().map(urlReader::apply).toList(),
                result.venue(),
                result.guides(),
                result.runningMinutes(),
                result.ageRating(),
                result.inquiryPhone(),
                result.links(),
                result.externalReservationUrl(),
                result.status(),
                result.maxTicketsPerReservation(),
                result.sessions()
        );
    }
}
