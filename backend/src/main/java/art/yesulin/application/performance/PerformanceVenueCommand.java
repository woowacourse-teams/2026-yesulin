package art.yesulin.application.performance;

import art.yesulin.domain.performance.PerformanceVenue;
import java.math.BigDecimal;

public record PerformanceVenueCommand(
        String name,
        String roadAddress,
        String detailAddress,
        String zonecode,
        BigDecimal latitude,
        BigDecimal longitude
) {

    public PerformanceVenue toVenue() {
        return new PerformanceVenue(name, roadAddress, detailAddress, zonecode, latitude, longitude);
    }
}
