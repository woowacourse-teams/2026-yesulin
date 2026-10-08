package art.yesulin.dormant.presentation.api.performance;

import art.yesulin.dormant.application.performance.PerformanceResult;
import java.math.BigDecimal;

public record PerformanceVenueAddressResponse(
        String roadAddress,
        String detailAddress,
        String zonecode,
        BigDecimal latitude,
        BigDecimal longitude
) {

    static PerformanceVenueAddressResponse from(PerformanceResult result) {
        return new PerformanceVenueAddressResponse(
                result.roadAddress(),
                result.detailAddress(),
                result.zonecode(),
                result.latitude(),
                result.longitude()
        );
    }
}
