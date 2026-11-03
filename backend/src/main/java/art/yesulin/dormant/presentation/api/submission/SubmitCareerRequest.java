package art.yesulin.dormant.presentation.api.submission;

import art.yesulin.dormant.application.submission.SubmitCareerCommand;
import art.yesulin.dormant.domain.submission.SubmissionCareer;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record SubmitCareerRequest(
        @Min(1_000) @Max(9_999) int year,
        @NotNull @Min(1) @Max(12) @Digits(integer = 2, fraction = 0) BigDecimal month,
        @NotBlank @Size(max = SubmissionCareer.MAX_TITLE_LENGTH) String title,
        @NotBlank @Size(max = SubmissionCareer.MAX_ROLE_NAME_LENGTH) String roleName
) {

    SubmitCareerCommand toCommand() {
        return new SubmitCareerCommand(year, month.intValueExact(), title, roleName);
    }
}
