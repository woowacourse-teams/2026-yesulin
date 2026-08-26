package art.yesulin.domain.audition.form;

import static art.yesulin.domain.audition.AuditionErrorCode.INVALID_FORM;
import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;

import art.yesulin.common.exception.BusinessException;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public record VideoRequirementPlans(List<VideoRequirementPlan> values) {

    public static final int MAX_REQUIREMENT_COUNT = 3;

    public VideoRequirementPlans {
        values = requireNonNull(values, "영상 요구사항은 필수입니다.");
        values.forEach(value -> requireNonNull(value, "영상 요구사항은 비어 있을 수 없습니다."));
        values = List.copyOf(values);
        if (values.size() > MAX_REQUIREMENT_COUNT) {
            throw new BusinessException(INVALID_FORM, "영상 링크는 최대 %d개까지 요청할 수 있습니다.".formatted(MAX_REQUIREMENT_COUNT));
        }
        validateUniqueIds(values);
    }

    private static void validateUniqueIds(List<VideoRequirementPlan> values) {
        Set<Long> requirementIds = new HashSet<>();
        for (VideoRequirementPlan value : values) {
            if (value.requirementId() != null && !requirementIds.add(value.requirementId())) {
                throw new BusinessException(INVALID_FORM, "같은 영상 요구사항을 중복해서 저장할 수 없습니다.");
            }
        }
    }
}
