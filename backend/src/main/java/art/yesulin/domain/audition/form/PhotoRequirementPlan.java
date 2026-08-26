package art.yesulin.domain.audition.form;

import static art.yesulin.domain.audition.AuditionErrorCode.INVALID_FORM;
import static art.yesulin.domain.common.validation.DomainValidator.requireText;

import art.yesulin.common.exception.BusinessException;

public record PhotoRequirementPlan(Long requirementId, String description, int count) {

    static final int MAX_DESCRIPTION_LENGTH = 255;

    public PhotoRequirementPlan {
        if (requirementId != null && requirementId < 1) {
            throw new BusinessException(INVALID_FORM, "사진 요구사항 ID는 1 이상이어야 합니다.");
        }
        description = requireText(description, "필요한 사진 설명은 필수입니다.");
        if (description.length() > MAX_DESCRIPTION_LENGTH) {
            throw new BusinessException(INVALID_FORM, "필요한 사진 설명은 255자를 넘을 수 없습니다.");
        }
        if (count < 1 || count > PhotoRequirementPlans.MAX_PHOTO_COUNT) {
            throw new BusinessException(
                    INVALID_FORM,
                    "사진 장수는 1장 이상 %d장 이하로 설정해야 합니다.".formatted(
                            PhotoRequirementPlans.MAX_PHOTO_COUNT
                    )
            );
        }
    }
}
