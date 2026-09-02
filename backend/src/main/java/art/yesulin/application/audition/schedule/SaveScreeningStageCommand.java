package art.yesulin.application.audition.schedule;

import art.yesulin.domain.audition.schedule.ScreeningStagePlan;
import java.time.LocalDate;

public record SaveScreeningStageCommand(
        Long stageId,
        String name,
        LocalDate date,
        String notice,
        AuditionVenueCommand venue
) {

    public SaveScreeningStageCommand(Long stageId, String name, LocalDate date, String notice) {
        this(stageId, name, date, notice, new AuditionVenueCommand("", "", "", "", null, null));
    }

    ScreeningStagePlan toPlan() {
        return new ScreeningStagePlan(stageId, name, date, notice, venue.toVenue());
    }
}
