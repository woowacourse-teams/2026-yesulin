package art.yesulin.presentation.api.performance;

import art.yesulin.application.performance.UpdatePerformanceCommand;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;

public record UpdatePerformanceRequest(
        @Positive long posterFileId,
        @NotBlank @Size(max = 200) String title,
        @Size(max = 200) String venue,
        @Valid PerformanceVenueAddressRequest venueAddress,
        @NotNull LocalDate performanceStartDate,
        LocalDate performanceEndDate,
        @NotNull List<@NotNull @Valid CreatePerformanceRoleRequest> roles
) {

    @jakarta.validation.constraints.AssertTrue(message = "공연 장소명과 도로명주소를 함께 입력해 주세요.")
    public boolean isVenueValid() {
        boolean noVenue = venueAddress == null && (venue == null || venue.isBlank());
        return noVenue || (venueAddress != null && venue != null && !venue.isBlank());
    }

    UpdatePerformanceCommand toCommand() {
        return new UpdatePerformanceCommand(
                posterFileId,
                title,
                venueAddress == null ? null : venueAddress.toCommand(venue),
                performanceStartDate,
                performanceEndDate,
                roles.stream().map(CreatePerformanceRoleRequest::toCommand).toList()
        );
    }
}
