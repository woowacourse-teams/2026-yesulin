package art.yesulin.presentation.api.submission;

import art.yesulin.application.submission.SubmitQuestionAnswerCommand;
import art.yesulin.domain.submission.QuestionAnswer;
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
