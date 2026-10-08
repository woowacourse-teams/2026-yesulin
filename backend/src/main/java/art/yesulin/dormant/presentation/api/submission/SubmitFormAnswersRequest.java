package art.yesulin.dormant.presentation.api.submission;

import art.yesulin.dormant.application.submission.SubmitFormAnswersCommand;
import art.yesulin.dormant.domain.submission.PhotoRequirementAnswers;
import art.yesulin.dormant.domain.submission.QuestionAnswers;
import art.yesulin.dormant.domain.submission.VideoRequirementAnswers;
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
