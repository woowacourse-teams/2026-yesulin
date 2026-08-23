package art.yesulin.presentation.api.submission;

import art.yesulin.application.submission.SubmitCareerCommand;
import art.yesulin.domain.submission.SubmissionCareer;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SubmitCareerRequest(
        @Min(1_000) @Max(9_999) int year,
        @NotBlank @Size(max = SubmissionCareer.MAX_TITLE_LENGTH) String title,
        @NotBlank @Size(max = SubmissionCareer.MAX_ROLE_NAME_LENGTH) String roleName
) {

    SubmitCareerCommand toCommand() {
        return new SubmitCareerCommand(year, title, roleName);
    }
}
