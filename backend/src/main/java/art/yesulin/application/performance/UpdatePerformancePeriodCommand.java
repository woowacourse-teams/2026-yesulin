package art.yesulin.application.performance;

import java.time.LocalDate;

/** 연결된 공고가 있어도 기간 충돌을 사람이 확정할 수 있도록 기간만 따로 바꾼다. */
public record UpdatePerformancePeriodCommand(
        LocalDate performanceStartDate,
        LocalDate performanceEndDate
) {
}
