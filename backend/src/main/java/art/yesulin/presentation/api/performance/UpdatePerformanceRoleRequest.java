package art.yesulin.presentation.api.performance;

import art.yesulin.application.performance.UpdatePerformanceRoleCommand;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdatePerformanceRoleRequest(
        @NotBlank @Size(max = 100) String name,
        @NotBlank @Size(max = 300) @Pattern(regexp = "^[^\\r\\n]+$") String description
) {

    UpdatePerformanceRoleCommand toCommand() {
        return new UpdatePerformanceRoleCommand(name, description);
    }
}
