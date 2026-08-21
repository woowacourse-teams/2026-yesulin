package art.yesulin.application.audition.role;

import art.yesulin.domain.audition.role.AuditionRoleSection;
import art.yesulin.domain.performance.Performance;
import art.yesulin.domain.performance.PerformanceRole;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

public record AuditionRolesResult(
        UUID auditionId,
        boolean multipleRoleApplicationsAllowed,
        List<AuditionRoleResult> roles
) {

    public static AuditionRolesResult from(
            UUID auditionId,
            AuditionRoleSection roleSection,
            Performance performance
    ) {
        Map<Long, PerformanceRole> performanceRoles = performance.getRoles().stream()
                .collect(Collectors.toMap(PerformanceRole::getId, Function.identity()));
        List<AuditionRoleResult> roles = roleSection.getRoles().stream()
                .map(role -> AuditionRoleResult.from(
                        role, getPerformanceRole(performanceRoles, role.getPerformanceRoleId())
                ))
                .toList();
        return new AuditionRolesResult(
                auditionId,
                roleSection.isMultipleRoleApplicationsAllowed(),
                roles
        );
    }

    private static PerformanceRole getPerformanceRole(Map<Long, PerformanceRole> performanceRoles, long roleId) {
        PerformanceRole role = performanceRoles.get(roleId);
        if (role == null) {
            throw new IllegalStateException("공고 배역에 연결된 공연 배역을 찾을 수 없습니다.");
        }
        return role;
    }
}
