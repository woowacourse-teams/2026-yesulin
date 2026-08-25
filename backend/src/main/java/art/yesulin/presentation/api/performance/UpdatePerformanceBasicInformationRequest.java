package art.yesulin.presentation.api.performance;

import art.yesulin.application.performance.UpdatePerformanceBasicInformationCommand;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdatePerformanceBasicInformationRequest(
        @NotBlank @Size(max = 200) String title,
        @Size(max = 300) String roadAddress,
        @Size(max = 200) String venue,
        @Valid PerformanceVenueAddressRequest venueAddress
) {

    @AssertTrue(message = "공연 장소명과 도로명주소는 필수입니다.")
    public boolean isVenueValid() {
        return venueAddress == null
                ? roadAddress != null && !roadAddress.isBlank()
                : venue != null && !venue.isBlank();
    }

    public UpdatePerformanceBasicInformationCommand toCommand() {
        if (venueAddress == null) {
            return new UpdatePerformanceBasicInformationCommand(title, roadAddress);
        }
        return new UpdatePerformanceBasicInformationCommand(title, venueAddress.toCommand(venue));
    }
}
