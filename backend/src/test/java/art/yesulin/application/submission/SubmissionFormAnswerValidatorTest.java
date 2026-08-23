package art.yesulin.application.submission;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.form.AdditionalInformationField;
import art.yesulin.domain.audition.form.BasicInformationField;
import art.yesulin.domain.submission.MilitaryServiceStatus;
import art.yesulin.domain.submission.SubmissionErrorCode;
import art.yesulin.domain.submission.SubmissionGender;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class SubmissionFormAnswerValidatorTest {

    private final SubmissionFormAnswerValidator validator = new SubmissionFormAnswerValidator();

    @Test
    void createsSnapshotsUsingCurrentFormTextAndOrder() {
        SubmissionFormDefinition form = new SubmissionFormDefinition(
                List.of(BasicInformationField.NAME, BasicInformationField.BIRTH),
                List.of(AdditionalInformationField.SPECIALTY),
                List.of(new SubmissionQuestionDefinition(1L, "지원 동기는 무엇인가요?", true)),
                List.of(new SubmissionPhotoRequirementDefinition(2L, "정면 사진", 1)),
                List.of(new SubmissionVideoRequirementDefinition(3L, "자유 연기 영상"))
        );
        SubmitSubmissionCommand command = command(
                new SubmitBasicInformationCommand(
                        "김하린", null, null, LocalDate.of(2000, 1, 1), null, null, null, null
                ),
                new SubmitAdditionalInformationCommand(
                        null, List.of(), null, null, "현대무용", null, null, List.of()
                ),
                new SubmitFormAnswersCommand(
                        List.of(new SubmitQuestionAnswerCommand(1L, "작품을 좋아합니다.")),
                        List.of(new SubmitPhotoRequirementAnswerCommand(2L, 10L)),
                        List.of(new SubmitVideoRequirementAnswerCommand(3L, "https://youtu.be/abcdefghijk"))
                )
        );

        ValidatedSubmissionForm result = validator.validateAndCreate(command, form);

        assertEquals(List.of("NAME", "BIRTH"), result.fieldSnapshot().basicFields().stream()
                .map(Enum::name)
                .toList());
        assertEquals("지원 동기는 무엇인가요?", result.answers().questionAnswers().values().getFirst().question());
        assertEquals("정면 사진", result.answers().photoRequirementAnswers().values()
                .getFirst().requirementDescription());
        assertEquals("자유 연기 영상", result.answers().videoRequirementAnswers().values()
                .getFirst().requirementDescription());
    }

    @Test
    void rejectsIdsThatAreNoLongerInCurrentForm() {
        SubmissionFormDefinition form = emptyForm();

        assertInvalid(commandWithAnswers(new SubmitFormAnswersCommand(
                List.of(new SubmitQuestionAnswerCommand(99L, "답변")), List.of(), List.of()
        )), form);
        assertInvalid(commandWithAnswers(new SubmitFormAnswersCommand(
                List.of(), List.of(new SubmitPhotoRequirementAnswerCommand(99L, 1L)), List.of()
        )), form);
        assertInvalid(commandWithAnswers(new SubmitFormAnswersCommand(
                List.of(), List.of(), List.of(new SubmitVideoRequirementAnswerCommand(
                        99L, "https://youtu.be/abcdefghijk"
                ))
        )), form);
    }

    @Test
    void rejectsMissingOrBlankRequiredQuestionAnswer() {
        SubmissionFormDefinition form = formWithRequiredQuestion();

        assertInvalid(commandWithAnswers(emptyAnswers()), form);
        assertInvalid(commandWithAnswers(new SubmitFormAnswersCommand(
                List.of(new SubmitQuestionAnswerCommand(1L, "  ")), List.of(), List.of()
        )), form);
    }

    @Test
    void rejectsPhotoCountDifferentFromRequirement() {
        SubmissionFormDefinition form = new SubmissionFormDefinition(
                List.of(), List.of(), List.of(),
                List.of(new SubmissionPhotoRequirementDefinition(1L, "정면 사진", 2)),
                List.of()
        );

        assertInvalid(commandWithAnswers(new SubmitFormAnswersCommand(
                List.of(), List.of(new SubmitPhotoRequirementAnswerCommand(1L, 10L)), List.of()
        )), form);
    }

    @Test
    void rejectsMissingVideoAndNonYoutubeUrl() {
        SubmissionFormDefinition form = new SubmissionFormDefinition(
                List.of(), List.of(), List.of(), List.of(),
                List.of(new SubmissionVideoRequirementDefinition(1L, "자유 연기 영상"))
        );

        assertInvalid(commandWithAnswers(emptyAnswers()), form);
        assertInvalid(commandWithAnswers(new SubmitFormAnswersCommand(
                List.of(), List.of(), List.of(new SubmitVideoRequirementAnswerCommand(
                        1L, "https://example.com/video"
                ))
        )), form);
    }

    @Test
    void requiresSelectedBasicFieldAndRejectsUnselectedInformation() {
        SubmissionFormDefinition requiredNameForm = new SubmissionFormDefinition(
                List.of(BasicInformationField.NAME), List.of(), List.of(), List.of(), List.of()
        );
        assertInvalid(commandWithAnswers(emptyAnswers()), requiredNameForm);

        SubmitBasicInformationCommand unselectedName = new SubmitBasicInformationCommand(
                "김하린", null, null, null, null, null, null, null
        );
        assertInvalid(command(unselectedName, emptyAdditionalInformation(), emptyAnswers()), emptyForm());
    }

    @Test
    void allowsSelectedAdditionalFieldToRemainEmptyAndRejectsUnselectedValue() {
        SubmissionFormDefinition specialtyForm = new SubmissionFormDefinition(
                List.of(), List.of(AdditionalInformationField.SPECIALTY), List.of(), List.of(), List.of()
        );
        validator.validateAndCreate(commandWithAnswers(emptyAnswers()), specialtyForm);

        SubmitAdditionalInformationCommand specialty = new SubmitAdditionalInformationCommand(
                null, List.of(), null, null, "현대무용", null,
                MilitaryServiceStatus.NOT_APPLICABLE, List.of()
        );
        assertInvalid(command(emptyBasicInformation(), specialty, emptyAnswers()), specialtyForm);
    }

    private void assertInvalid(SubmitSubmissionCommand command, SubmissionFormDefinition form) {
        BusinessException exception = assertThrows(
                BusinessException.class, () -> validator.validateAndCreate(command, form)
        );
        assertEquals(SubmissionErrorCode.INVALID_FORM_ANSWER, exception.getErrorCode());
    }

    private SubmissionFormDefinition formWithRequiredQuestion() {
        return new SubmissionFormDefinition(
                List.of(), List.of(),
                List.of(new SubmissionQuestionDefinition(1L, "지원 동기는 무엇인가요?", true)),
                List.of(), List.of()
        );
    }

    private SubmissionFormDefinition emptyForm() {
        return new SubmissionFormDefinition(List.of(), List.of(), List.of(), List.of(), List.of());
    }

    private SubmitSubmissionCommand commandWithAnswers(SubmitFormAnswersCommand answers) {
        return command(emptyBasicInformation(), emptyAdditionalInformation(), answers);
    }

    private SubmitSubmissionCommand command(
            SubmitBasicInformationCommand basicInformation,
            SubmitAdditionalInformationCommand additionalInformation,
            SubmitFormAnswersCommand answers
    ) {
        return new SubmitSubmissionCommand(
                basicInformation,
                additionalInformation,
                List.of(1L),
                answers,
                new SubmitConsentsCommand(true, true)
        );
    }

    private SubmitBasicInformationCommand emptyBasicInformation() {
        return new SubmitBasicInformationCommand(null, null, null, null, null, null, null, null);
    }

    private SubmitAdditionalInformationCommand emptyAdditionalInformation() {
        return new SubmitAdditionalInformationCommand(
                null, List.of(), null, null, null, null, null, List.of()
        );
    }

    private SubmitFormAnswersCommand emptyAnswers() {
        return new SubmitFormAnswersCommand(List.of(), List.of(), List.of());
    }
}
