package art.yesulin.application.submission.form;

import art.yesulin.application.submission.SubmitFormAnswersCommand;
import art.yesulin.application.submission.SubmitSubmissionCommand;
import art.yesulin.domain.submission.SubmissionAdditionalInformation;
import art.yesulin.domain.submission.SubmissionBasicInformation;
import art.yesulin.domain.submission.SubmissionFormAnswers;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SubmissionFormAnswerValidator {

    private final SubmissionInformationValidator informationValidator;
    private final SubmissionFieldSnapshotFactory fieldSnapshotFactory;
    private final SubmissionQuestionAnswerValidator questionAnswerValidator;
    private final SubmissionPhotoRequirementAnswerValidator photoRequirementAnswerValidator;
    private final SubmissionVideoRequirementAnswerValidator videoRequirementAnswerValidator;

    public ValidatedSubmissionForm validateAndCreate(
            SubmitSubmissionCommand command,
            SubmissionFormDefinition form
    ) {
        SubmissionBasicInformation basicInformation = command.toBasicInformation();
        SubmissionAdditionalInformation additionalInformation = command.toAdditionalInformation();
        informationValidator.validate(basicInformation, additionalInformation, form);
        return new ValidatedSubmissionForm(
                basicInformation,
                additionalInformation,
                fieldSnapshotFactory.create(form),
                createAnswers(command.formAnswers(), form)
        );
    }

    private SubmissionFormAnswers createAnswers(
            SubmitFormAnswersCommand command,
            SubmissionFormDefinition form
    ) {
        return new SubmissionFormAnswers(
                questionAnswerValidator.validateAndCreate(
                        command.questionAnswers(), form.questions()
                ),
                photoRequirementAnswerValidator.validateAndCreate(
                        command.photoRequirementAnswers(), form.photoRequirements()
                ),
                videoRequirementAnswerValidator.validateAndCreate(
                        command.videoRequirementAnswers(), form.videoRequirements()
                )
        );
    }
}
