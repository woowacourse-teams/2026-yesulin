package art.yesulin.presentation.api.audition;

import art.yesulin.application.audition.CreateAuditionCommand;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.UUID;

public record CreateAuditionRequest(
        @NotNull UUID id,
        @Positive(message = "공연을 선택해 주세요.") long performanceId,
        @NotBlank(message = "공고명을 입력해 주세요.")
        @Size(max = 200, message = "공고명은 200자 이내로 입력해 주세요.")
        String title,
        @NotNull(message = "공연 시작일을 입력해 주세요.") LocalDate performanceStartDate,
        LocalDate performanceEndDate
) {

    public CreateAuditionCommand toCommand() {
        return new CreateAuditionCommand(id, performanceId, title, performanceStartDate, performanceEndDate);
    }
}
