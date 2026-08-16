package art.yesulin.presentation.api.performance;

import art.yesulin.application.performance.CreatePerformanceCommand;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CreatePerformanceRequest(
        @Positive long posterFileId,
        @NotBlank @Size(max = 200) String title,
        @NotBlank @Size(max = 300) String roadAddress,
        List<@NotNull @Valid CreatePerformanceRoleRequest> roles
) {

    public CreatePerformanceRequest {
        roles = roles == null ? List.of() : roles;
    }

    public CreatePerformanceCommand toCommand() {
        return new CreatePerformanceCommand(
                posterFileId,
                title,
                roadAddress,
                roles.stream().map(CreatePerformanceRoleRequest::toCommand).toList()
        );
    }
}
