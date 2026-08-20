package art.yesulin.application.audition.role;

import art.yesulin.domain.audition.role.AuditionRoleSelections;
import java.util.List;
import java.util.Objects;

public record SaveAuditionRolesCommand(
        boolean multipleRoleApplicationsAllowed,
        List<SaveAuditionRoleCommand> roles
) {

    public SaveAuditionRolesCommand {
        roles = List.copyOf(Objects.requireNonNull(roles, "공고 배역 목록은 필수입니다."));
    }

    public AuditionRoleSelections toSelections() {
        return new AuditionRoleSelections(
                multipleRoleApplicationsAllowed,
                roles.stream().map(SaveAuditionRoleCommand::toSelection).toList()
        );
    }
}
