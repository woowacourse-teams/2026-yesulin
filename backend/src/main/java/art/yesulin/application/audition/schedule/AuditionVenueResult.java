package art.yesulin.application.audition.schedule;

import art.yesulin.domain.audition.schedule.AuditionVenue;
import java.math.BigDecimal;

public record AuditionVenueResult(
        String name,
        String roadAddress,
        String detailAddress,
        String zonecode,
        BigDecimal latitude,
        BigDecimal longitude
) {

    public static AuditionVenueResult from(AuditionVenue venue) {
        if (venue == null) {
            return null;
        }
        return new AuditionVenueResult(
                venue.getName(), venue.getRoadAddress(), venue.getDetailAddress(), venue.getZonecode(),
                venue.getLatitude(), venue.getLongitude()
        );
    }
}
