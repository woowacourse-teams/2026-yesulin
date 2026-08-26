package art.yesulin.presentation.api.performance;

import art.yesulin.application.performance.UpdatePerformanceCommand;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;

public record UpdatePerformanceRequest(
        @Positive long posterFileId,
        @NotBlank @Size(max = 200) String title,
        @NotBlank @Size(max = 200) String venue,
        @NotNull @Valid PerformanceVenueAddressRequest venueAddress,
        @NotNull List<@NotNull @Valid CreatePerformanceRoleRequest> roles
) {

    UpdatePerformanceCommand toCommand() {
        return new UpdatePerformanceCommand(
                posterFileId,
                title,
                venueAddress.toCommand(venue),
                roles.stream().map(CreatePerformanceRoleRequest::toCommand).toList()
        );
    }
}
