package art.yesulin.domain.audition.form;

import static art.yesulin.domain.audition.AuditionErrorCode.INVALID_FORM;
import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;

import art.yesulin.common.exception.BusinessException;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public record AdditionalQuestionPlans(List<AdditionalQuestionPlan> values) {

    public AdditionalQuestionPlans {
        values = requireNonNull(values, "추가 질문은 필수입니다.");
        values.forEach(value -> requireNonNull(value, "추가 질문은 비어 있을 수 없습니다."));
        values = List.copyOf(values);
        validateUniqueIds(values);
    }

    private static void validateUniqueIds(List<AdditionalQuestionPlan> values) {
        Set<Long> questionIds = new HashSet<>();
        for (AdditionalQuestionPlan value : values) {
            if (value.questionId() != null && !questionIds.add(value.questionId())) {
                throw new BusinessException(INVALID_FORM, "같은 추가 질문을 중복해서 저장할 수 없습니다.");
            }
        }
    }
}
