package art.yesulin.show.application;

import art.yesulin.show.domain.ShowGenre;
import art.yesulin.show.domain.ShowStatus;
import java.util.List;
import java.util.UUID;

public record PublicShowResult(
        UUID id,
        long ownerId,
        String hostName,
        String title,
        ShowGenre genre,
        String description,
        long posterFileId,
        List<Long> imageFileIds,
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
}
