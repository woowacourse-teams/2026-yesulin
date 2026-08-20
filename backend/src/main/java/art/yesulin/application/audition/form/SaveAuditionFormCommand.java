package art.yesulin.application.audition.form;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;

import art.yesulin.domain.audition.form.AdditionalInformationField;
import art.yesulin.domain.audition.form.AdditionalQuestionPlans;
import art.yesulin.domain.audition.form.ApplicationFields;
import art.yesulin.domain.audition.form.AuditionFormPlan;
import art.yesulin.domain.audition.form.BasicInformationField;
import art.yesulin.domain.audition.form.PhotoRequirementPlans;
import art.yesulin.domain.audition.form.VideoRequirementPlans;
import java.util.List;

public record SaveAuditionFormCommand(
        List<String> basicFields,
        List<String> additionalFields,
        List<SavePhotoRequirementCommand> photoRequirements,
        List<SaveVideoRequirementCommand> videoRequirements,
        List<SaveAdditionalQuestionCommand> additionalQuestions
) {

    public SaveAuditionFormCommand {
        basicFields = List.copyOf(requireNonNull(basicFields, "기본사항은 필수입니다."));
        additionalFields = List.copyOf(requireNonNull(additionalFields, "추가정보는 필수입니다."));
        photoRequirements = List.copyOf(requireNonNull(photoRequirements, "사진 요구사항은 필수입니다."));
        videoRequirements = List.copyOf(requireNonNull(videoRequirements, "영상 요구사항은 필수입니다."));
        additionalQuestions = List.copyOf(requireNonNull(additionalQuestions, "추가 질문은 필수입니다."));
    }

    public AuditionFormPlan toPlan() {
        ApplicationFields fields = new ApplicationFields(
                basicFields.stream().map(BasicInformationField::from).toList(),
                additionalFields.stream().map(AdditionalInformationField::from).toList()
        );
        PhotoRequirementPlans photos = new PhotoRequirementPlans(
                photoRequirements.stream().map(SavePhotoRequirementCommand::toPlan).toList()
        );
        VideoRequirementPlans videos = new VideoRequirementPlans(
                videoRequirements.stream().map(SaveVideoRequirementCommand::toPlan).toList()
        );
        AdditionalQuestionPlans questions = new AdditionalQuestionPlans(
                additionalQuestions.stream().map(SaveAdditionalQuestionCommand::toPlan).toList()
        );
        return new AuditionFormPlan(fields, photos, videos, questions);
    }
}
