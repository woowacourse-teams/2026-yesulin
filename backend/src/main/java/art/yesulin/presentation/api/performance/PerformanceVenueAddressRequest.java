package art.yesulin.presentation.api.performance;

import art.yesulin.application.performance.PerformanceVenueCommand;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record PerformanceVenueAddressRequest(
        @NotBlank @Size(max = 300) String roadAddress,
        @Size(max = 300) String detailAddress,
        @Size(max = 20) String zonecode,
        @DecimalMin("-90") @DecimalMax("90") BigDecimal latitude,
        @DecimalMin("-180") @DecimalMax("180") BigDecimal longitude
) {

    @AssertTrue(message = "위도와 경도는 함께 입력해야 합니다.")
    public boolean isCoordinatePairValid() {
        return (latitude == null) == (longitude == null);
    }

    PerformanceVenueCommand toCommand(String venue) {
        return new PerformanceVenueCommand(
                venue,
                roadAddress,
                detailAddress == null ? "" : detailAddress,
                zonecode == null ? "" : zonecode,
                latitude,
                longitude
        );
    }
}
