package art.yesulin.domain.submission;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.submission.SubmissionErrorCode.INVALID_SUBMISSION;

import art.yesulin.common.exception.BusinessException;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Embeddable
@EqualsAndHashCode
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SelectedRoles {

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "submission_selected_roles", joinColumns = @JoinColumn(name = "submission_id"))
    @OrderColumn(name = "role_order")
    private List<SelectedRole> values = new ArrayList<>();

    public SelectedRoles(List<SelectedRole> values) {
        List<SelectedRole> safeValues = requireNonNull(values, "선택 배역 목록은 필수입니다.");
        if (safeValues.isEmpty()) {
            throw new BusinessException(INVALID_SUBMISSION, "제출 배역은 한 개 이상이어야 합니다.");
        }
        safeValues.forEach(value -> requireNonNull(value, "선택 배역은 비어 있을 수 없습니다."));
        validateUniqueRoleIds(safeValues);
        this.values = new ArrayList<>(safeValues);
    }

    private static void validateUniqueRoleIds(List<SelectedRole> values) {
        Set<Long> roleIds = new HashSet<>();
        if (values.stream().anyMatch(role -> !roleIds.add(role.auditionRoleId()))) {
            throw new BusinessException(INVALID_SUBMISSION, "같은 공고 배역을 중복해서 제출할 수 없습니다.");
        }
    }

    public List<SelectedRole> values() {
        return List.copyOf(values);
    }
}
