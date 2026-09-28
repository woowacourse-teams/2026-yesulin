package art.yesulin.application.show;

import art.yesulin.domain.show.ShowGenre;
import art.yesulin.domain.show.ShowStatus;
import java.util.List;
import java.util.UUID;

public record PublicShowResult(
        UUID id,
        long ownerId,
        String title,
        ShowGenre genre,
        String description,
        long posterFileId,
        List<Long> imageFileIds,
        ShowVenueResult venue,
        String directionsNote,
        int runningMinutes,
        String ageRating,
        String inquiryPhone,
        List<ShowLinkResult> links,
        ShowStatus status,
        int maxTicketsPerReservation,
        List<PublicShowSessionResult> sessions
) {
}
