package art.yesulin.application.performance;

import java.util.List;

public record UpdatePerformanceCommand(
        long posterFileId,
        String title,
        String roadAddress,
        List<UpdatePerformanceRoleCommand> roles
) {

    public UpdatePerformanceCommand {
        roles = roles == null ? List.of() : List.copyOf(roles);
    }
}
