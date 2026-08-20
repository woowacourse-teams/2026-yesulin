package art.yesulin.presentation.api.audition;

import art.yesulin.application.audition.role.SaveAuditionRolesCommand;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record SaveAuditionRolesRequest(
        boolean multipleRoleApplicationsAllowed,
        @NotEmpty List<@NotNull @Valid SaveAuditionRoleRequest> roles
) {

    public SaveAuditionRolesCommand toCommand() {
        return new SaveAuditionRolesCommand(
                multipleRoleApplicationsAllowed,
                roles.stream().map(SaveAuditionRoleRequest::toCommand).toList()
        );
    }
}
