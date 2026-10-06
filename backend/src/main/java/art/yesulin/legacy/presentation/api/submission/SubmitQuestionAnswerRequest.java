package art.yesulin.legacy.presentation.api.submission;

import art.yesulin.legacy.application.submission.SubmitQuestionAnswerCommand;
import art.yesulin.legacy.domain.submission.QuestionAnswer;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record SubmitQuestionAnswerRequest(
        @Positive long questionId,
        @Size(max = QuestionAnswer.MAX_ANSWER_LENGTH) String answer
) {

    SubmitQuestionAnswerCommand toCommand() {
        return new SubmitQuestionAnswerCommand(questionId, answer);
    }
}
