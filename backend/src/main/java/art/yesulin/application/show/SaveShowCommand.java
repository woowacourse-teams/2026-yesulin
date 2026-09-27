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
        List<Long> imageFileIds
) {

    Show toShow(long ownerId) {
        return new Show(
                ownerId, title, genre, description, venue.toVenue(), runningMinutes, ageRating,
                inquiryPhone, posterFileId, imageFileIds
        );
    }

    void applyTo(Show show) {
        show.update(
                title, genre, description, venue.toVenue(), runningMinutes, ageRating,
                inquiryPhone, posterFileId, imageFileIds
        );
    }
}
