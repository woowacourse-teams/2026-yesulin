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
        @NotBlank @Size(max = 300) String roadAddress,
        List<@NotNull @Valid UpdatePerformanceRoleRequest> roles
) {

    public UpdatePerformanceCommand toCommand() {
        List<UpdatePerformanceRoleRequest> safeRoles = roles == null ? List.of() : roles;
        return new UpdatePerformanceCommand(
                posterFileId,
                title,
                roadAddress,
                safeRoles.stream().map(UpdatePerformanceRoleRequest::toCommand).toList()
        );
    }
}
