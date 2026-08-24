package art.yesulin.presentation.api.submission;

import art.yesulin.application.submission.SubmitVideoRequirementAnswerCommand;
import art.yesulin.domain.submission.VideoRequirementAnswer;
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
