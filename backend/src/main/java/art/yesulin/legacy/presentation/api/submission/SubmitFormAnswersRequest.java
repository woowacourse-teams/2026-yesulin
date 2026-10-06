package art.yesulin.legacy.presentation.api.submission;

import art.yesulin.legacy.application.submission.SubmitFormAnswersCommand;
import art.yesulin.legacy.domain.submission.PhotoRequirementAnswers;
import art.yesulin.legacy.domain.submission.QuestionAnswers;
import art.yesulin.legacy.domain.submission.VideoRequirementAnswers;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record SubmitFormAnswersRequest(
        @NotNull @Size(max = QuestionAnswers.MAX_QUESTION_COUNT)
        List<@NotNull @Valid SubmitQuestionAnswerRequest> questionAnswers,
        @NotNull @Size(max = PhotoRequirementAnswers.MAX_PHOTO_COUNT)
        List<@NotNull @Valid SubmitPhotoRequirementAnswerRequest> photoRequirementAnswers,
        @NotNull @Size(max = VideoRequirementAnswers.MAX_VIDEO_COUNT)
        List<@NotNull @Valid SubmitVideoRequirementAnswerRequest> videoRequirementAnswers
) {

    SubmitFormAnswersCommand toCommand() {
        return new SubmitFormAnswersCommand(
                questionAnswers.stream().map(SubmitQuestionAnswerRequest::toCommand).toList(),
                photoRequirementAnswers.stream().map(SubmitPhotoRequirementAnswerRequest::toCommand).toList(),
                videoRequirementAnswers.stream().map(SubmitVideoRequirementAnswerRequest::toCommand).toList()
        );
    }
}
