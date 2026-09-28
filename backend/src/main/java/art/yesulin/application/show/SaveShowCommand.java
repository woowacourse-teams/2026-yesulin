package art.yesulin.application.show;

import art.yesulin.application.performance.PerformanceVenueCommand;
import art.yesulin.domain.show.Show;
import art.yesulin.domain.show.ShowGenre;
import java.util.List;

public record SaveShowCommand(
        String title,
        ShowGenre genre,
        String description,
        PerformanceVenueCommand venue,
        int runningMinutes,
        String ageRating,
        String inquiryPhone,
        long posterFileId,
        List<Long> imageFileIds,
        List<ShowLinkCommand> links,
        String directionsNote,
        boolean remainingSeatsVisible
) {

    Show toShow(long ownerId) {
        Show show = new Show(
                ownerId, title, genre, description, venue.toVenue(), runningMinutes, ageRating,
                inquiryPhone, posterFileId, imageFileIds
        );
        applyAudienceGuideTo(show);
        return show;
    }

    void applyTo(Show show) {
        show.update(
                title, genre, description, venue.toVenue(), runningMinutes, ageRating,
                inquiryPhone, posterFileId, imageFileIds
        );
        applyAudienceGuideTo(show);
    }

    private void applyAudienceGuideTo(Show show) {
        List<ShowLinkCommand> values = links == null ? List.of() : links;
        show.updateAudienceGuide(
                values.stream().map(ShowLinkCommand::toLink).toList(), directionsNote, remainingSeatsVisible
        );
    }
}
