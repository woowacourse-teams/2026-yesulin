package art.yesulin.presentation.api.audition;

import art.yesulin.application.audition.schedule.AuditionVenueResult;
import java.math.BigDecimal;

public record AuditionVenueAddressResponse(
        String roadAddress,
        String detailAddress,
        String zonecode,
        BigDecimal latitude,
        BigDecimal longitude
) {

    static AuditionVenueAddressResponse from(AuditionVenueResult venue) {
        if (venue == null) {
            return null;
        }
        return new AuditionVenueAddressResponse(
                venue.roadAddress(), venue.detailAddress(), venue.zonecode(), venue.latitude(), venue.longitude()
        );
    }
}
