package art.yesulin.presentation.api.performance;

import art.yesulin.application.performance.UpdatePerformanceBasicInformationCommand;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdatePerformanceBasicInformationRequest(
        @NotBlank @Size(max = 200) String title,
        @NotBlank @Size(max = 300) String roadAddress
) {

    public UpdatePerformanceBasicInformationCommand toCommand() {
        return new UpdatePerformanceBasicInformationCommand(title, roadAddress);
    }
}
