package art.yesulin.domain.submission;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.submission.SubmissionErrorCode.INVALID_SUBMISSION;

import art.yesulin.common.exception.BusinessException;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public record SelectedRoles(List<SelectedRole> values) {

    public SelectedRoles {
        values = requireNonNull(values, "선택 배역 목록은 필수입니다.");
        if (values.isEmpty()) {
            throw new BusinessException(INVALID_SUBMISSION, "제출 배역은 한 개 이상이어야 합니다.");
        }
        values.forEach(value -> requireNonNull(value, "선택 배역은 비어 있을 수 없습니다."));
        values = List.copyOf(values);
        validateUniqueRoleIds(values);
    }

    private static void validateUniqueRoleIds(List<SelectedRole> values) {
        Set<Long> roleIds = new HashSet<>();
        if (values.stream().anyMatch(role -> !roleIds.add(role.auditionRoleId()))) {
            throw new BusinessException(INVALID_SUBMISSION, "같은 공고 배역을 중복해서 제출할 수 없습니다.");
        }
    }
}
