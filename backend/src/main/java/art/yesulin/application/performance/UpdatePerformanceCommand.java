package art.yesulin.application.performance;

public record UpdatePerformanceCommand(
        long posterFileId,
        String title,
        PerformanceVenueCommand venue
) {
}
