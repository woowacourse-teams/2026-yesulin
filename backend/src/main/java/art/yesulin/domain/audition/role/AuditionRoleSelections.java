package art.yesulin.domain.audition.role;

import static art.yesulin.domain.audition.AuditionErrorCode.INVALID_ROLE_SECTION;
import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;

import art.yesulin.common.exception.BusinessException;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode
public class AuditionRoleSelections {

    private static final int MINIMUM_ROLE_COUNT = 1;
    private static final int MINIMUM_MULTIPLE_APPLICATION_ROLE_COUNT = 2;

    private final boolean multipleRoleApplicationsAllowed;
    private final List<AuditionRoleSelection> values;

    public AuditionRoleSelections(
            boolean multipleRoleApplicationsAllowed,
            List<AuditionRoleSelection> selections
    ) {
        List<AuditionRoleSelection> safeSelections = requireNonNull(
                selections, "공고 배역 목록은 필수입니다."
        );
        validateRoleCount(multipleRoleApplicationsAllowed, safeSelections.size());
        safeSelections.forEach(selection -> requireNonNull(selection, "공고 배역 정보는 필수입니다."));
        validateDuplicateRoles(safeSelections);
        this.multipleRoleApplicationsAllowed = multipleRoleApplicationsAllowed;
        this.values = List.copyOf(safeSelections);
    }

    private void validateRoleCount(boolean multipleRoleApplicationsAllowed, int roleCount) {
        if (roleCount < MINIMUM_ROLE_COUNT) {
            throw new BusinessException(
                    INVALID_ROLE_SECTION, "공고 배역은 한 개 이상 선택해야 합니다."
            );
        }
        if (multipleRoleApplicationsAllowed && roleCount < MINIMUM_MULTIPLE_APPLICATION_ROLE_COUNT) {
            throw new BusinessException(
                    INVALID_ROLE_SECTION,
                    "복수 배역 지원을 허용하려면 배역을 두 개 이상 선택해야 합니다."
            );
        }
    }

    private void validateDuplicateRoles(List<AuditionRoleSelection> selections) {
        Set<Long> roleIds = new HashSet<>();
        if (selections.stream().anyMatch(selection -> !roleIds.add(selection.performanceRoleId()))) {
            throw new BusinessException(
                    INVALID_ROLE_SECTION, "같은 공연 배역을 중복 선택할 수 없습니다."
            );
        }
    }

    public boolean allowsMultipleApplications() {
        return multipleRoleApplicationsAllowed;
    }

    public List<AuditionRoleSelection> values() {
        return values;
    }

    public Set<Long> performanceRoleIds() {
        return values.stream().map(AuditionRoleSelection::performanceRoleId).collect(Collectors.toSet());
    }
}
