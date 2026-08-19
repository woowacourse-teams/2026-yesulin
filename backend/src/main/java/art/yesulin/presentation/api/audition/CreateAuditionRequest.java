package art.yesulin.presentation.api.audition;

import art.yesulin.application.audition.CreateAuditionCommand;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record CreateAuditionRequest(
        @Positive long performanceId,
        @NotBlank @Size(max = 200) String title,
        @NotNull LocalDate performanceStartDate,
        LocalDate performanceEndDate
) {

    public CreateAuditionCommand toCommand() {
        return new CreateAuditionCommand(performanceId, title, performanceStartDate, performanceEndDate);
    }
}
