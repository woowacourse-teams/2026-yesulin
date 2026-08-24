package art.yesulin.application.submission.form;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.application.submission.SubmitPhotoRequirementAnswerCommand;
import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.submission.PhotoRequirementAnswers;
import art.yesulin.domain.submission.SubmissionErrorCode;
import java.util.List;
import org.junit.jupiter.api.Test;

class SubmissionPhotoRequirementAnswerValidatorTest {

    private final SubmissionPhotoRequirementAnswerValidator validator =
            new SubmissionPhotoRequirementAnswerValidator();

    @Test
    void createsAnswersUsingRequirementTextAndOrder() {
        List<SubmissionPhotoRequirementDefinition> definitions = List.of(
                new SubmissionPhotoRequirementDefinition(2L, "측면 사진", 1),
                new SubmissionPhotoRequirementDefinition(1L, "정면 사진", 2)
        );
        List<SubmitPhotoRequirementAnswerCommand> commands = List.of(
                new SubmitPhotoRequirementAnswerCommand(1L, 10L),
                new SubmitPhotoRequirementAnswerCommand(2L, 20L),
                new SubmitPhotoRequirementAnswerCommand(1L, 11L)
        );

        PhotoRequirementAnswers answers = validator.validateAndCreate(commands, definitions);

        assertEquals(List.of(2L, 1L, 1L), answers.values().stream()
                .map(answer -> answer.photoRequirementId())
                .toList());
        assertEquals(List.of(20L, 10L, 11L), answers.values().stream()
                .map(answer -> answer.fileId())
                .toList());
    }

    @Test
    void rejectsUnknownRequirementAndWrongPhotoCount() {
        List<SubmissionPhotoRequirementDefinition> definitions = List.of(
                new SubmissionPhotoRequirementDefinition(1L, "정면 사진", 2)
        );

        assertInvalid(List.of(new SubmitPhotoRequirementAnswerCommand(99L, 10L)), definitions);
        assertInvalid(List.of(new SubmitPhotoRequirementAnswerCommand(1L, 10L)), definitions);
    }

    @Test
    void rejectsDuplicateRequirementAndFileAssociation() {
        List<SubmissionPhotoRequirementDefinition> definitions = List.of(
                new SubmissionPhotoRequirementDefinition(1L, "정면 사진", 2)
        );
        List<SubmitPhotoRequirementAnswerCommand> commands = List.of(
                new SubmitPhotoRequirementAnswerCommand(1L, 10L),
                new SubmitPhotoRequirementAnswerCommand(1L, 10L)
        );

        assertInvalid(commands, definitions);
    }

    private void assertInvalid(
            List<SubmitPhotoRequirementAnswerCommand> commands,
            List<SubmissionPhotoRequirementDefinition> definitions
    ) {
        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> validator.validateAndCreate(commands, definitions)
        );
        assertEquals(SubmissionErrorCode.INVALID_FORM_ANSWER, exception.getErrorCode());
    }
}
