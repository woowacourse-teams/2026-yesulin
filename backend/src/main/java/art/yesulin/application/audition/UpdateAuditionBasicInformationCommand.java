package art.yesulin.application.audition;

import art.yesulin.application.audition.schedule.AuditionVenueCommand;
import art.yesulin.domain.audition.PerformancePeriod;
import java.time.LocalDate;

public record UpdateAuditionBasicInformationCommand(
        String title,
        LocalDate performanceStartDate,
        LocalDate performanceEndDate,
        AuditionVenueCommand rehearsalVenue
) {

    public UpdateAuditionBasicInformationCommand(
            String title,
            LocalDate performanceStartDate,
            LocalDate performanceEndDate
    ) {
        this(title, performanceStartDate, performanceEndDate, new AuditionVenueCommand("", "", "", "", null, null));
    }

    public PerformancePeriod performancePeriod() {
        return new PerformancePeriod(performanceStartDate, performanceEndDate);
    }
}
