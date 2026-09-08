package art.yesulin.application.performance;

import java.time.LocalDate;

public record UpdatePerformanceBasicInformationCommand(
        String title,
        PerformanceVenueCommand venue,
        LocalDate performanceStartDate,
        LocalDate performanceEndDate
) {

    public UpdatePerformanceBasicInformationCommand(String title, String roadAddress) {
        this(title, new PerformanceVenueCommand(roadAddress, roadAddress, "", "", null, null), null, null);
    }
}
