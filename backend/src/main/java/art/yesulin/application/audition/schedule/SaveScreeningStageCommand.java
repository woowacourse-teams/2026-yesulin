package art.yesulin.application.audition.schedule;

import art.yesulin.domain.audition.schedule.ScreeningStagePlan;
import java.time.LocalDate;

public record SaveScreeningStageCommand(Long stageId, String name, LocalDate date, String notice) {

    ScreeningStagePlan toPlan() {
        return new ScreeningStagePlan(stageId, name, date, notice);
    }
}
