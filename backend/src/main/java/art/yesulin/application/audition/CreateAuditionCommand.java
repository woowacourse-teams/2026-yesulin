package art.yesulin.application.audition;

import art.yesulin.domain.audition.PerformancePeriod;
import java.time.LocalDate;
import java.util.UUID;

public record CreateAuditionCommand(
        UUID id,
        long performanceId,
        String title,
        LocalDate performanceStartDate,
        LocalDate performanceEndDate
) {

    public PerformancePeriod performancePeriod() {
        return new PerformancePeriod(performanceStartDate, performanceEndDate);
    }
}
