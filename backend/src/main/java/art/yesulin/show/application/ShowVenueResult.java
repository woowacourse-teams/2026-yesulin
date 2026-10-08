package art.yesulin.show.application;

import art.yesulin.show.domain.performance.PerformanceVenue;
import java.math.BigDecimal;

public record ShowVenueResult(
        String name,
        String roadAddress,
        String detailAddress,
        String zonecode,
        BigDecimal latitude,
        BigDecimal longitude
) {

    static ShowVenueResult from(PerformanceVenue venue) {
        return new ShowVenueResult(
                venue.getName(),
                venue.getRoadAddress(),
                venue.getDetailAddress(),
                venue.getZonecode(),
                venue.getLatitude(),
                venue.getLongitude()
        );
    }
}
