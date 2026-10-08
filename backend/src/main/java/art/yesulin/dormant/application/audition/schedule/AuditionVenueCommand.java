package art.yesulin.dormant.application.audition.schedule;

import art.yesulin.dormant.domain.audition.schedule.AuditionVenue;
import java.math.BigDecimal;

public record AuditionVenueCommand(
        String name,
        String roadAddress,
        String detailAddress,
        String zonecode,
        BigDecimal latitude,
        BigDecimal longitude
) {

    public AuditionVenue toVenue() {
        return new AuditionVenue(name, roadAddress, detailAddress, zonecode, latitude, longitude);
    }
}
