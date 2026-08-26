package art.yesulin.presentation.api.audition;

import art.yesulin.application.audition.role.SaveAuditionRolesCommand;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record SaveAuditionRolesRequest(
        boolean multipleRoleApplicationsAllowed,
        @NotEmpty(message = "모집할 배역을 하나 이상 선택해 주세요.") List<@NotNull @Valid SaveAuditionRoleRequest> roles
) {

    public SaveAuditionRolesCommand toCommand() {
        return new SaveAuditionRolesCommand(
                multipleRoleApplicationsAllowed,
                roles.stream().map(SaveAuditionRoleRequest::toCommand).toList()
        );
    }
}
