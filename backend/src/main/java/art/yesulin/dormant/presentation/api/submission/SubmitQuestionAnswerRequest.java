package art.yesulin.dormant.presentation.api.submission;

import art.yesulin.dormant.application.submission.SubmitQuestionAnswerCommand;
import art.yesulin.dormant.domain.submission.QuestionAnswer;
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
