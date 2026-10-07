package art.yesulin.presentation.api.show;

import art.yesulin.application.show.PublicShowResult;
import art.yesulin.application.show.PublicShowSessionResult;
import art.yesulin.application.show.ShowGuideResult;
import art.yesulin.application.show.ShowLinkResult;
import art.yesulin.application.show.ShowVenueResult;
import art.yesulin.domain.show.ShowGenre;
import art.yesulin.domain.show.ShowStatus;
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
