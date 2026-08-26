package art.yesulin.presentation.api.performance;

import art.yesulin.application.performance.CreatePerformanceCommand;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CreatePerformanceRequest(
        @Positive(message = "공연 포스터를 등록해 주세요.") long posterFileId,
        @NotBlank(message = "공연명을 입력해 주세요.")
        @Size(max = 200, message = "공연명은 200자 이내로 입력해 주세요.")
        String title,
        @Size(max = 300) String roadAddress,
        @Size(max = 200) String venue,
        @Valid PerformanceVenueAddressRequest venueAddress,
        List<@NotNull @Valid CreatePerformanceRoleRequest> roles
) {

    public CreatePerformanceRequest {
        roles = roles == null ? List.of() : roles;
    }

    @AssertTrue(message = "공연 장소명과 도로명주소는 필수입니다.")
    public boolean isVenueValid() {
        return venueAddress == null
                ? roadAddress != null && !roadAddress.isBlank()
                : venue != null && !venue.isBlank();
    }

    public CreatePerformanceCommand toCommand() {
        if (venueAddress == null) {
            return new CreatePerformanceCommand(
                    posterFileId,
                    title,
                    roadAddress,
                    roles.stream().map(CreatePerformanceRoleRequest::toCommand).toList()
            );
        }
        return new CreatePerformanceCommand(
                posterFileId,
                title,
                venueAddress.toCommand(venue),
                roles.stream().map(CreatePerformanceRoleRequest::toCommand).toList()
        );
    }
}
