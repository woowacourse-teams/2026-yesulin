package art.yesulin.presentation.api.performance;

import art.yesulin.application.performance.UpdatePerformanceBasicInformationCommand;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record UpdatePerformanceBasicInformationRequest(
        @NotBlank @Size(max = 200) String title,
        @Size(max = 300) String roadAddress,
        @Size(max = 200) String venue,
        @Valid PerformanceVenueAddressRequest venueAddress,
        @NotNull LocalDate performanceStartDate,
        LocalDate performanceEndDate
) {

    @AssertTrue(message = "공연 장소명과 도로명주소를 함께 입력해 주세요.")
    public boolean isVenueValid() {
        boolean noVenue = venueAddress == null && (roadAddress == null || roadAddress.isBlank())
                && (venue == null || venue.isBlank());
        return noVenue || (venueAddress == null
                ? roadAddress != null && !roadAddress.isBlank()
                : venue != null && !venue.isBlank());
    }

    public UpdatePerformanceBasicInformationCommand toCommand() {
        return new UpdatePerformanceBasicInformationCommand(
                title,
                venueAddress == null
                        ? (roadAddress == null || roadAddress.isBlank() ? null
                        : new art.yesulin.application.performance.PerformanceVenueCommand(
                                roadAddress, roadAddress, "", "", null, null))
                        : venueAddress.toCommand(venue),
                performanceStartDate,
                performanceEndDate
        );
    }
}
