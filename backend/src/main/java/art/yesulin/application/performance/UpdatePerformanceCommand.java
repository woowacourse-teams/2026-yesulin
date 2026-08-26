package art.yesulin.application.performance;

import java.util.List;

public record UpdatePerformanceCommand(
        long posterFileId,
        String title,
        PerformanceVenueCommand venue,
        List<CreatePerformanceRoleCommand> roles
) {

    public UpdatePerformanceCommand {
        roles = List.copyOf(roles);
    }
}
