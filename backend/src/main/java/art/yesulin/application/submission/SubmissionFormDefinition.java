package art.yesulin.application.submission;

import art.yesulin.domain.audition.form.AdditionalInformationField;
import art.yesulin.domain.audition.form.BasicInformationField;
import java.util.List;

record SubmissionFormDefinition(
        List<BasicInformationField> basicFields,
        List<AdditionalInformationField> additionalFields,
        List<SubmissionQuestionDefinition> questions,
        List<SubmissionPhotoRequirementDefinition> photoRequirements,
        List<SubmissionVideoRequirementDefinition> videoRequirements
) {

    SubmissionFormDefinition {
        basicFields = List.copyOf(basicFields);
        additionalFields = List.copyOf(additionalFields);
        questions = List.copyOf(questions);
        photoRequirements = List.copyOf(photoRequirements);
        videoRequirements = List.copyOf(videoRequirements);
    }
}
