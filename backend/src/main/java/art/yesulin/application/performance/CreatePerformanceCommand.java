package art.yesulin.application.performance;

import java.util.List;

public record CreatePerformanceCommand(
        long posterFileId,
        String title,
        String roadAddress,
        List<CreatePerformanceRoleCommand> roles
) {

    public CreatePerformanceCommand {
        roles = roles == null ? List.of() : List.copyOf(roles);
    }
}
