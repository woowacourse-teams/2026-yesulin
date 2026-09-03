package art.yesulin.presentation.api.performance;

import art.yesulin.application.performance.CreatePerformanceCommand;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;

public record CreatePerformanceRequest(
        @Positive(message = "공연 포스터를 등록해 주세요.") long posterFileId,
        @NotBlank(message = "공연명을 입력해 주세요.")
        @Size(max = 200, message = "공연명은 200자 이내로 입력해 주세요.")
        String title,
        @Size(max = 300) String roadAddress,
        @Size(max = 200) String venue,
        @Valid PerformanceVenueAddressRequest venueAddress,
        @NotNull(message = "공연 시작일을 입력해 주세요.") LocalDate performanceStartDate,
        LocalDate performanceEndDate,
        List<@NotNull @Valid CreatePerformanceRoleRequest> roles
) {

    public CreatePerformanceRequest {
        roles = roles == null ? List.of() : roles;
    }

    @AssertTrue(message = "공연 장소명과 도로명주소를 함께 입력해 주세요.")
    public boolean isVenueValid() {
        boolean noVenue = venueAddress == null && (roadAddress == null || roadAddress.isBlank())
                && (venue == null || venue.isBlank());
        return noVenue || (venueAddress == null
                ? roadAddress != null && !roadAddress.isBlank()
                : venue != null && !venue.isBlank());
    }

    public CreatePerformanceCommand toCommand() {
        return new CreatePerformanceCommand(
                posterFileId,
                title,
                venueAddress == null
                        ? (roadAddress == null || roadAddress.isBlank() ? null
                        : new art.yesulin.application.performance.PerformanceVenueCommand(
                                roadAddress, roadAddress, "", "", null, null))
                        : venueAddress.toCommand(venue),
                performanceStartDate,
                performanceEndDate,
                roles.stream().map(CreatePerformanceRoleRequest::toCommand).toList()
        );
    }
}
