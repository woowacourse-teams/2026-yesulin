package art.yesulin.presentation.api.audition;

import art.yesulin.application.audition.schedule.SaveScreeningStageCommand;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record SaveScreeningStageRequest(
        @Positive Long stageId,
        @NotBlank @Size(max = 100) String name,
        @NotNull LocalDate date,
        @Size(max = 100) String notice
) {

    SaveScreeningStageCommand toCommand() {
        return new SaveScreeningStageCommand(stageId, name, date, notice);
    }
}
