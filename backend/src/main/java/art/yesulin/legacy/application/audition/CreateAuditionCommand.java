package art.yesulin.legacy.application.audition;

import art.yesulin.legacy.application.audition.schedule.AuditionVenueCommand;
import art.yesulin.legacy.domain.audition.PerformancePeriod;
import java.time.LocalDate;
import java.util.UUID;

public record CreateAuditionCommand(
        UUID id,
        long performanceId,
        String title,
        LocalDate performanceStartDate,
        LocalDate performanceEndDate,
        AuditionVenueCommand rehearsalVenue
) {

    public CreateAuditionCommand(
            UUID id,
            long performanceId,
            String title,
            LocalDate performanceStartDate,
            LocalDate performanceEndDate
    ) {
        this(id, performanceId, title, performanceStartDate, performanceEndDate,
                new AuditionVenueCommand("", "", "", "", null, null));
    }

    public PerformancePeriod performancePeriod() {
        return new PerformancePeriod(performanceStartDate, performanceEndDate);
    }
}
