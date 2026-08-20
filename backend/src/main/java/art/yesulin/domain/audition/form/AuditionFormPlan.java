package art.yesulin.domain.audition.form;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;

public record AuditionFormPlan(
        ApplicationFields fields,
        PhotoRequirementPlans photoRequirements,
        VideoRequirementPlans videoRequirements,
        AdditionalQuestionPlans additionalQuestions
) {

    public AuditionFormPlan {
        requireNonNull(fields, "지원 폼 항목은 필수입니다.");
        requireNonNull(photoRequirements, "사진 요구사항은 필수입니다.");
        requireNonNull(videoRequirements, "영상 요구사항은 필수입니다.");
        requireNonNull(additionalQuestions, "추가 질문은 필수입니다.");
    }
}
