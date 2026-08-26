package art.yesulin.presentation.api.audition;

import art.yesulin.application.audition.schedule.SaveScreeningStageCommand;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record SaveScreeningStageRequest(
        @Positive Long stageId,
        @NotBlank(message = "전형 이름을 입력해 주세요.")
        @Size(max = 100, message = "전형 이름은 100자 이내로 입력해 주세요.")
        String name,
        @NotNull(message = "전형 날짜를 입력해 주세요.") LocalDate date,
        @Size(max = 100) String notice
) {

    SaveScreeningStageCommand toCommand() {
        return new SaveScreeningStageCommand(stageId, name, date, notice);
    }
}
