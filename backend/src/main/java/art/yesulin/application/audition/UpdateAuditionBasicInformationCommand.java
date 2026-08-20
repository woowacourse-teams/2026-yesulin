package art.yesulin.application.audition;

import art.yesulin.domain.audition.PerformancePeriod;
import java.time.LocalDate;

public record UpdateAuditionBasicInformationCommand(
        String title,
        LocalDate performanceStartDate,
        LocalDate performanceEndDate
) {

    public PerformancePeriod performancePeriod() {
        return new PerformancePeriod(performanceStartDate, performanceEndDate);
    }
}
