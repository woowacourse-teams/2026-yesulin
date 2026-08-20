package art.yesulin.presentation.api.audition;

import art.yesulin.application.audition.UpdateAuditionBasicInformationCommand;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record UpdateAuditionBasicInformationRequest(
        @NotBlank @Size(max = 200) String title,
        @NotNull LocalDate performanceStartDate,
        LocalDate performanceEndDate
) {

    public UpdateAuditionBasicInformationCommand toCommand() {
        return new UpdateAuditionBasicInformationCommand(title, performanceStartDate, performanceEndDate);
    }
}
