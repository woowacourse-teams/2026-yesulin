package art.yesulin.application.audition.schedule;

import art.yesulin.domain.audition.schedule.ScreeningStage;
import java.time.LocalDate;

public record ScreeningStageResult(long id, int order, String name, LocalDate date, String notice) {

    static ScreeningStageResult from(ScreeningStage stage, int order) {
        return new ScreeningStageResult(stage.getId(), order, stage.getName(), stage.getDate(), stage.getNotice());
    }
}
