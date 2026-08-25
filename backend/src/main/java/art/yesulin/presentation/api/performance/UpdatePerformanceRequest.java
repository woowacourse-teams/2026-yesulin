package art.yesulin.presentation.api.performance;

import art.yesulin.application.performance.UpdatePerformanceCommand;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record UpdatePerformanceRequest(
        @Positive long posterFileId,
        @NotBlank @Size(max = 200) String title,
        @NotBlank @Size(max = 200) String venue,
        @NotNull @Valid PerformanceVenueAddressRequest venueAddress
) {

    UpdatePerformanceCommand toCommand() {
        return new UpdatePerformanceCommand(
                posterFileId,
                title,
                venueAddress.toCommand(venue)
        );
    }
}
