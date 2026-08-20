package art.yesulin.presentation.api.audition;

import art.yesulin.application.audition.schedule.SaveAuditionScheduleCommand;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

public record SaveAuditionScheduleRequest(
        @NotNull Instant recruitmentStartAt,
        @NotNull Instant recruitmentEndAt,
        @NotNull @Size(min = 1, max = 5) List<@NotNull @Valid SaveScreeningStageRequest> stages
) {

    SaveAuditionScheduleCommand toCommand() {
        return new SaveAuditionScheduleCommand(
                recruitmentStartAt,
                recruitmentEndAt,
                stages.stream().map(SaveScreeningStageRequest::toCommand).toList()
        );
    }
}
