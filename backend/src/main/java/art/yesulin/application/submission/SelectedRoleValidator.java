package art.yesulin.application.submission;

import static art.yesulin.domain.submission.SubmissionErrorCode.INVALID_SELECTED_ROLE;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.submission.SelectedRole;
import art.yesulin.domain.submission.SelectedRoles;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
class SelectedRoleValidator {

    SelectedRoles validateAndCreate(List<Long> selectedRoleIds, SubmissionAudition audition) {
        if (selectedRoleIds.isEmpty()) {
            throw invalid("배역을 한 개 이상 선택해야 합니다.");
        }
        if (new HashSet<>(selectedRoleIds).size() != selectedRoleIds.size()) {
            throw invalid("같은 배역을 중복해서 선택할 수 없습니다.");
        }
        if (!audition.multipleRoleApplicationsAllowed() && selectedRoleIds.size() != 1) {
            throw invalid("이 공고에는 하나의 배역만 선택할 수 있습니다.");
        }

        Map<Long, SubmissionAuditionRole> rolesById = audition.roles().stream()
                .collect(Collectors.toMap(SubmissionAuditionRole::id, Function.identity()));
        List<SelectedRole> selectedRoles = selectedRoleIds.stream()
                .map(roleId -> findRole(rolesById, roleId))
                .map(role -> new SelectedRole(role.id(), role.name()))
                .toList();
        return new SelectedRoles(selectedRoles);
    }

    private SubmissionAuditionRole findRole(Map<Long, SubmissionAuditionRole> rolesById, long roleId) {
        SubmissionAuditionRole role = rolesById.get(roleId);
        if (role == null) {
            throw invalid("현재 공고에서 선택할 수 없는 배역입니다.");
        }
        return role;
    }

    private BusinessException invalid(String message) {
        return new BusinessException(INVALID_SELECTED_ROLE, message);
    }
}
