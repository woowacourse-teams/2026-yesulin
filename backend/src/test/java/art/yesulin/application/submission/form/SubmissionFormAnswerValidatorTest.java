package art.yesulin.application.submission.form;

import static org.junit.jupiter.api.Assertions.assertEquals;

import art.yesulin.application.submission.SubmitAdditionalInformationCommand;
import art.yesulin.application.submission.SubmitBasicInformationCommand;
import art.yesulin.application.submission.SubmitConsentsCommand;
import art.yesulin.application.submission.SubmitFormAnswersCommand;
import art.yesulin.application.submission.SubmitPhotoRequirementAnswerCommand;
import art.yesulin.application.submission.SubmitQuestionAnswerCommand;
import art.yesulin.application.submission.SubmitSubmissionCommand;
import art.yesulin.application.submission.SubmitVideoRequirementAnswerCommand;
import art.yesulin.domain.audition.form.AdditionalInformationField;
import art.yesulin.domain.audition.form.BasicInformationField;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class SubmissionFormAnswerValidatorTest {

    private final SubmissionFormAnswerValidator validator = new SubmissionFormAnswerValidator(
            new SubmissionInformationValidator(),
            new SubmissionFieldSnapshotFactory(),
            new SubmissionQuestionAnswerValidator(),
            new SubmissionPhotoRequirementAnswerValidator(),
            new SubmissionVideoRequirementAnswerValidator(new YouTubeUrlValidator())
    );

    @Test
    void createsValidatedFormUsingServerDefinitions() {
        SubmissionFormDefinition form = new SubmissionFormDefinition(
                List.of(BasicInformationField.NAME, BasicInformationField.BIRTH),
                List.of(AdditionalInformationField.SPECIALTY),
                List.of(new SubmissionQuestionDefinition(1L, "지원 동기는 무엇인가요?", true)),
                List.of(new SubmissionPhotoRequirementDefinition(2L, "정면 사진", 1)),
                List.of(new SubmissionVideoRequirementDefinition(3L, "자유 연기 영상"))
        );
        SubmitSubmissionCommand command = new SubmitSubmissionCommand(
                new SubmitBasicInformationCommand(
                        "김하린", null, null, LocalDate.of(2000, 1, 1), null, null, null, null
                ),
                new SubmitAdditionalInformationCommand(
                        null, List.of(), null, null, "현대무용", null, null, List.of()
                ),
                List.of(1L),
                new SubmitFormAnswersCommand(
                        List.of(new SubmitQuestionAnswerCommand(1L, "작품을 좋아합니다.")),
                        List.of(new SubmitPhotoRequirementAnswerCommand(2L, 10L)),
                        List.of(new SubmitVideoRequirementAnswerCommand(3L, "https://youtu.be/abcdefghijk"))
                ),
                new SubmitConsentsCommand(true, true)
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
}
