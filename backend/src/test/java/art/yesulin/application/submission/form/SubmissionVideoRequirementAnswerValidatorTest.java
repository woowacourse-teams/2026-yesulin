package art.yesulin.application.submission.form;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.application.submission.SubmitVideoRequirementAnswerCommand;
import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.submission.SubmissionErrorCode;
import art.yesulin.domain.submission.VideoRequirementAnswers;
import java.util.List;
import org.junit.jupiter.api.Test;

class SubmissionVideoRequirementAnswerValidatorTest {

    private final SubmissionVideoRequirementAnswerValidator validator =
            new SubmissionVideoRequirementAnswerValidator(new YouTubeUrlValidator());

    @Test
    void createsAnswersUsingRequirementTextAndOrder() {
        List<SubmissionVideoRequirementDefinition> definitions = List.of(
                new SubmissionVideoRequirementDefinition(2L, "지정 연기"),
                new SubmissionVideoRequirementDefinition(1L, "자유 연기")
        );
        List<SubmitVideoRequirementAnswerCommand> commands = List.of(
                new SubmitVideoRequirementAnswerCommand(1L, "https://youtu.be/abcdefghijk"),
                new SubmitVideoRequirementAnswerCommand(2L, "https://www.youtube.com/watch?v=12345678901")
        );

        VideoRequirementAnswers answers = validator.validateAndCreate(commands, definitions);

        assertEquals(List.of(2L, 1L), answers.values().stream()
                .map(answer -> answer.videoRequirementId())
                .toList());
        assertEquals(List.of("지정 연기", "자유 연기"), answers.values().stream()
                .map(answer -> answer.requirementDescription())
                .toList());
    }

    @Test
    void rejectsUnknownMissingAndDuplicateRequirement() {
        List<SubmissionVideoRequirementDefinition> definitions = List.of(
                new SubmissionVideoRequirementDefinition(1L, "자유 연기")
        );

        assertInvalid(List.of(new SubmitVideoRequirementAnswerCommand(
                99L, "https://youtu.be/abcdefghijk"
        )), definitions);
        assertInvalid(List.of(), definitions);
        assertInvalid(List.of(
                new SubmitVideoRequirementAnswerCommand(1L, "https://youtu.be/abcdefghijk"),
                new SubmitVideoRequirementAnswerCommand(1L, "https://youtu.be/12345678901")
        ), definitions);
    }

    @Test
    void rejectsUrlWithoutYoutubeVideo() {
        List<SubmissionVideoRequirementDefinition> definitions = List.of(
                new SubmissionVideoRequirementDefinition(1L, "자유 연기")
        );

        assertInvalid(List.of(new SubmitVideoRequirementAnswerCommand(1L, "https://youtube.com/")), definitions);
    }

    private void assertInvalid(
            List<SubmitVideoRequirementAnswerCommand> commands,
            List<SubmissionVideoRequirementDefinition> definitions
    ) {
        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> validator.validateAndCreate(commands, definitions)
        );
        assertEquals(SubmissionErrorCode.INVALID_FORM_ANSWER, exception.getErrorCode());
    }
}
