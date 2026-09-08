package art.yesulin.presentation.api.performance;

import art.yesulin.application.performance.UpdatePerformancePeriodCommand;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record UpdatePerformancePeriodRequest(
        @NotNull(message = "공연 시작일을 입력해 주세요.") LocalDate performanceStartDate,
        LocalDate performanceEndDate
) {

    UpdatePerformancePeriodCommand toCommand() {
        return new UpdatePerformancePeriodCommand(performanceStartDate, performanceEndDate);
    }
}
