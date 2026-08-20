package art.yesulin.application.audition;

import art.yesulin.domain.audition.PerformancePeriod;
import java.time.LocalDate;

public record CreateAuditionCommand(
        long performanceId,
        String title,
        LocalDate performanceStartDate,
        LocalDate performanceEndDate
) {

    public PerformancePeriod performancePeriod() {
        return new PerformancePeriod(performanceStartDate, performanceEndDate);
    }
}
