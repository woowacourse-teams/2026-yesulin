package art.yesulin.legacy.presentation.api.submission;

import art.yesulin.legacy.application.submission.SubmitVideoRequirementAnswerCommand;
import art.yesulin.legacy.domain.submission.VideoRequirementAnswer;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record SubmitVideoRequirementAnswerRequest(
        @Positive long videoRequirementId,
        @NotBlank @Size(max = VideoRequirementAnswer.MAX_URL_LENGTH) String url
) {

    SubmitVideoRequirementAnswerCommand toCommand() {
        return new SubmitVideoRequirementAnswerCommand(videoRequirementId, url);
    }
}
