package art.yesulin.show.presentation.api;

import art.yesulin.show.application.performance.PerformanceVenueCommand;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record ShowVenueRequest(
        @NotBlank @Size(max = 200) String name,
        @NotBlank @Size(max = 300) String roadAddress,
        @Size(max = 300) String detailAddress,
        @Size(max = 20) String zonecode,
        @DecimalMin("-90") @DecimalMax("90") BigDecimal latitude,
        @DecimalMin("-180") @DecimalMax("180") BigDecimal longitude
) {

    PerformanceVenueCommand toCommand() {
        return new PerformanceVenueCommand(name, roadAddress, detailAddress, zonecode, latitude, longitude);
    }
}
