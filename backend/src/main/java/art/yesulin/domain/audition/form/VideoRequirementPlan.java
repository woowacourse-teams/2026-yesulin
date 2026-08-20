package art.yesulin.domain.audition.form;

import static art.yesulin.domain.audition.AuditionErrorCode.INVALID_FORM;
import static art.yesulin.domain.common.validation.DomainValidator.requireText;

import art.yesulin.common.exception.BusinessException;

public record VideoRequirementPlan(Long requirementId, String description) {

    static final int MAX_DESCRIPTION_LENGTH = 255;

    public VideoRequirementPlan {
        if (requirementId != null && requirementId < 1) {
            throw new BusinessException(INVALID_FORM, "영상 요구사항 ID는 1 이상이어야 합니다.");
        }
        description = requireText(description, "필요한 영상 설명은 필수입니다.");
        if (description.length() > MAX_DESCRIPTION_LENGTH) {
            throw new BusinessException(INVALID_FORM, "필요한 영상 설명은 255자를 넘을 수 없습니다.");
        }
    }
}
