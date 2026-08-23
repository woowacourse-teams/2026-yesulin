package art.yesulin.presentation.api.submission;

import art.yesulin.application.submission.SubmitPhotoRequirementAnswerCommand;
import jakarta.validation.constraints.Positive;

public record SubmitPhotoRequirementAnswerRequest(
        @Positive long photoRequirementId,
        @Positive long fileId
) {

    SubmitPhotoRequirementAnswerCommand toCommand() {
        return new SubmitPhotoRequirementAnswerCommand(photoRequirementId, fileId);
    }
}
