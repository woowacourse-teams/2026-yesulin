package art.yesulin.presentation.api.audition;

import art.yesulin.domain.audition.query.AuditionManagementResult;
import art.yesulin.domain.audition.query.AuditionRoleManagementResult;
import java.util.List;
import java.util.UUID;

public record AuditionRolesManagementResponse(
        UUID auditionId,
        boolean multipleRoleApplicationsAllowed,
        AuditionManagementResponse posting,
        List<AuditionRoleManagementResult> roles
) {

    public AuditionRolesManagementResponse {
        roles = List.copyOf(roles);
    }

    public static AuditionRolesManagementResponse from(AuditionManagementResult result) {
        return new AuditionRolesManagementResponse(
                result.id(), result.multipleRoleApplicationsAllowed(), AuditionManagementResponse.from(result),
                result.roles()
        );
    }
}
