package art.yesulin.application.performance;

import java.time.LocalDate;
import java.util.List;

public record CreatePerformanceCommand(
        long posterFileId,
        String title,
        PerformanceVenueCommand venue,
        LocalDate performanceStartDate,
        LocalDate performanceEndDate,
        List<CreatePerformanceRoleCommand> roles
) {

    public CreatePerformanceCommand {
        roles = roles == null ? List.of() : List.copyOf(roles);
    }

    public CreatePerformanceCommand(
            long posterFileId,
            String title,
            PerformanceVenueCommand venue,
            List<CreatePerformanceRoleCommand> roles
    ) {
        this(posterFileId, title, venue, null, null, roles);
    }

    public CreatePerformanceCommand(
            long posterFileId,
            String title,
            String roadAddress,
            List<CreatePerformanceRoleCommand> roles
    ) {
        this(
                posterFileId,
                title,
                new PerformanceVenueCommand(roadAddress, roadAddress, "", "", null, null),
                null,
                null,
                roles
        );
    }
}
