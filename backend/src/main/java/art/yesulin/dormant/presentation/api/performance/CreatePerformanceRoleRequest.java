package art.yesulin.dormant.presentation.api.performance;

import art.yesulin.dormant.application.performance.CreatePerformanceRoleCommand;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreatePerformanceRoleRequest(
        @NotBlank @Size(max = 100) String name,
        @NotBlank @Size(max = 300) @Pattern(regexp = "^[^\\r\\n]+$") String description
) {

    CreatePerformanceRoleCommand toCommand() {
        return new CreatePerformanceRoleCommand(name, description);
    }
}
