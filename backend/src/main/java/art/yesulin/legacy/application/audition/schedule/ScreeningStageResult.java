package art.yesulin.legacy.application.audition.schedule;

import art.yesulin.legacy.domain.audition.schedule.ScreeningStage;
import java.time.LocalDate;

public record ScreeningStageResult(
        long id,
        int order,
        String name,
        LocalDate date,
        String notice,
        AuditionVenueResult venue
) {

    static ScreeningStageResult from(ScreeningStage stage, int order) {
        return new ScreeningStageResult(
                stage.getId(), order, stage.getName(), stage.getDate(), stage.getNotice(),
                AuditionVenueResult.from(stage.getVenue())
        );
    }
}
