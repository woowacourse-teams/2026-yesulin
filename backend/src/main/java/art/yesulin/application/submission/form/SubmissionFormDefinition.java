package art.yesulin.application.submission.form;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;

import art.yesulin.domain.audition.form.AdditionalInformationField;
import art.yesulin.domain.audition.form.AuditionForm;
import art.yesulin.domain.audition.form.BasicInformationField;
import java.util.List;

public record SubmissionFormDefinition(
        List<BasicInformationField> basicFields,
        List<AdditionalInformationField> additionalFields,
        List<SubmissionQuestionDefinition> questions,
        List<SubmissionPhotoRequirementDefinition> photoRequirements,
        List<SubmissionVideoRequirementDefinition> videoRequirements
) {

    public SubmissionFormDefinition {
        basicFields = List.copyOf(basicFields);
        additionalFields = List.copyOf(additionalFields);
        questions = List.copyOf(questions);
        photoRequirements = List.copyOf(photoRequirements);
        videoRequirements = List.copyOf(videoRequirements);
    }

    public static SubmissionFormDefinition from(AuditionForm form) {
        AuditionForm validForm = requireNonNull(form, "제출할 지원 폼은 필수입니다.");
        return new SubmissionFormDefinition(
                validForm.getBasicFields(),
                validForm.getAdditionalFields(),
                validForm.getAdditionalQuestions().stream()
                        .map(question -> new SubmissionQuestionDefinition(
                                question.getId(), question.getQuestion(), question.isRequired()
                        ))
                        .toList(),
                validForm.getPhotoRequirements().stream()
                        .map(requirement -> new SubmissionPhotoRequirementDefinition(
                                requirement.getId(), requirement.getDescription(), requirement.getCount()
                        ))
                        .toList(),
                validForm.getVideoRequirements().stream()
                        .map(requirement -> new SubmissionVideoRequirementDefinition(
                                requirement.getId(), requirement.getDescription()
                        ))
                        .toList()
        );
    }
}
