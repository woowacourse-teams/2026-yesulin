package art.yesulin.application.performance;

import java.time.LocalDate;
import java.util.List;

public record UpdatePerformanceCommand(
        long posterFileId,
        String title,
        PerformanceVenueCommand venue,
        LocalDate performanceStartDate,
        LocalDate performanceEndDate,
        List<CreatePerformanceRoleCommand> roles
) {

    public UpdatePerformanceCommand(
            long posterFileId,
            String title,
            PerformanceVenueCommand venue,
            List<CreatePerformanceRoleCommand> roles
    ) {
        this(posterFileId, title, venue, null, null, roles);
    }

    public UpdatePerformanceCommand {
        roles = List.copyOf(roles);
    }
}
