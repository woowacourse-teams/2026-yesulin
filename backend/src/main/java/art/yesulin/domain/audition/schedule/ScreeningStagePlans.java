package art.yesulin.domain.audition.schedule;

import static art.yesulin.domain.audition.AuditionErrorCode.INVALID_SCHEDULE;
import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;

import art.yesulin.common.exception.BusinessException;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public record ScreeningStagePlans(List<ScreeningStagePlan> values) {

    public static final int MIN_STAGE_COUNT = 1;
    public static final int MAX_STAGE_COUNT = 5;

    public ScreeningStagePlans {
        values = requireNonNull(values, "전형 정보는 필수입니다.");
        values.forEach(value -> requireNonNull(value, "전형 정보는 비어 있을 수 없습니다."));
        values = List.copyOf(values);
        validateCount(values);
        validateUniqueIds(values);
        validateDateOrder(values);
    }

    private static void validateCount(List<ScreeningStagePlan> values) {
        if (values.size() < MIN_STAGE_COUNT || values.size() > MAX_STAGE_COUNT) {
            throw new BusinessException(INVALID_SCHEDULE, "전형은 1개 이상 5개 이하로 설정해야 합니다.");
        }
    }

    private static void validateUniqueIds(List<ScreeningStagePlan> values) {
        Set<Long> stageIds = new HashSet<>();
        for (ScreeningStagePlan value : values) {
            if (value.stageId() != null && !stageIds.add(value.stageId())) {
                throw new BusinessException(INVALID_SCHEDULE, "같은 전형을 중복해서 저장할 수 없습니다.");
            }
        }
    }

    private static void validateDateOrder(List<ScreeningStagePlan> values) {
        for (int index = 1; index < values.size(); index++) {
            if (values.get(index).date().isBefore(values.get(index - 1).date())) {
                throw new BusinessException(INVALID_SCHEDULE, "전형 날짜는 진행 순서대로 설정해야 합니다.");
            }
        }
    }
}
