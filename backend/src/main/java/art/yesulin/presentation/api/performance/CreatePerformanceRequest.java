package art.yesulin.presentation.api.performance;

import art.yesulin.application.performance.CreatePerformanceCommand;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CreatePerformanceRequest(
        @Positive long posterFileId,
        @NotBlank @Size(max = 200) String title,
        @NotBlank @Size(max = 300) String roadAddress,
        List<@Valid CreatePerformanceRoleRequest> roles
) {

    public CreatePerformanceCommand toCommand() {
        List<CreatePerformanceRoleRequest> safeRoles = roles == null ? List.of() : roles;
        return new CreatePerformanceCommand(
                posterFileId,
                title,
                roadAddress,
                safeRoles.stream().map(CreatePerformanceRoleRequest::toCommand).toList()
        );
    }
}
