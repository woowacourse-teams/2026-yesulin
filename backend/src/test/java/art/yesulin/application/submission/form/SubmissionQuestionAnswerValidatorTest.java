package art.yesulin.application.submission.form;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.application.submission.SubmitQuestionAnswerCommand;
import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.submission.QuestionAnswers;
import art.yesulin.domain.submission.SubmissionErrorCode;
import java.util.List;
import org.junit.jupiter.api.Test;

class SubmissionQuestionAnswerValidatorTest {

    private final SubmissionQuestionAnswerValidator validator = new SubmissionQuestionAnswerValidator();

    @Test
    void createsAnswersUsingDefinitionTextAndOrder() {
        List<SubmissionQuestionDefinition> definitions = List.of(
                new SubmissionQuestionDefinition(2L, "두 번째 질문", false),
                new SubmissionQuestionDefinition(1L, "첫 번째 질문", true)
        );
        List<SubmitQuestionAnswerCommand> commands = List.of(
                new SubmitQuestionAnswerCommand(1L, "첫 번째 답변"),
                new SubmitQuestionAnswerCommand(2L, "두 번째 답변")
        );

        QuestionAnswers answers = validator.validateAndCreate(commands, definitions);

        assertEquals(List.of(2L, 1L), answers.values().stream().map(answer -> answer.questionId()).toList());
        assertEquals(List.of("두 번째 질문", "첫 번째 질문"), answers.values().stream()
                .map(answer -> answer.question())
                .toList());
    }

    @Test
    void rejectsUnknownAndDuplicateQuestionIds() {
        List<SubmissionQuestionDefinition> definitions = List.of(
                new SubmissionQuestionDefinition(1L, "질문", false)
        );

        assertInvalid(List.of(new SubmitQuestionAnswerCommand(99L, "답변")), definitions);
        assertInvalid(List.of(
                new SubmitQuestionAnswerCommand(1L, "첫 답변"),
                new SubmitQuestionAnswerCommand(1L, "두 번째 답변")
        ), definitions);
    }

    @Test
    void rejectsMissingOrBlankRequiredAnswer() {
        List<SubmissionQuestionDefinition> definitions = List.of(
                new SubmissionQuestionDefinition(1L, "필수 질문", true)
        );

        assertInvalid(List.of(), definitions);
        assertInvalid(List.of(new SubmitQuestionAnswerCommand(1L, "  ")), definitions);
    }

    private void assertInvalid(
            List<SubmitQuestionAnswerCommand> commands,
            List<SubmissionQuestionDefinition> definitions
    ) {
        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> validator.validateAndCreate(commands, definitions)
        );
        assertEquals(SubmissionErrorCode.INVALID_FORM_ANSWER, exception.getErrorCode());
    }
}
