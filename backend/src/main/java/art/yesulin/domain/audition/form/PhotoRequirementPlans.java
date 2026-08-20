package art.yesulin.domain.audition.form;

import static art.yesulin.domain.audition.AuditionErrorCode.INVALID_FORM;
import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;

import art.yesulin.common.exception.BusinessException;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public record PhotoRequirementPlans(List<PhotoRequirementPlan> values) {

    public static final int MAX_PHOTO_COUNT = 10;

    public PhotoRequirementPlans {
        values = requireNonNull(values, "사진 요구사항은 필수입니다.");
        values.forEach(value -> requireNonNull(value, "사진 요구사항은 비어 있을 수 없습니다."));
        values = List.copyOf(values);
        validateTotalCount(values);
        validateUniqueIds(values);
    }

    private static void validateTotalCount(List<PhotoRequirementPlan> values) {
        int totalCount = values.stream().mapToInt(PhotoRequirementPlan::count).sum();
        if (totalCount > MAX_PHOTO_COUNT) {
            throw new BusinessException(INVALID_FORM, "프로필 사진은 모두 합해 최대 10장까지 요청할 수 있습니다.");
        }
    }

    private static void validateUniqueIds(List<PhotoRequirementPlan> values) {
        Set<Long> requirementIds = new HashSet<>();
        for (PhotoRequirementPlan value : values) {
            if (value.requirementId() != null && !requirementIds.add(value.requirementId())) {
                throw new BusinessException(INVALID_FORM, "같은 사진 요구사항을 중복해서 저장할 수 없습니다.");
            }
        }
    }
}
