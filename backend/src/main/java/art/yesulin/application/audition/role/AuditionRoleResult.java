package art.yesulin.application.audition.role;

import art.yesulin.domain.audition.role.AuditionRole;
import art.yesulin.domain.performance.PerformanceRole;

public record AuditionRoleResult(
        long id,
        long performanceRoleId,
        String name,
        String description,
        int recruitmentCount,
        String gender,
        int minimumAge,
        int maximumAge
) {

    static AuditionRoleResult from(AuditionRole role, PerformanceRole performanceRole) {
        return new AuditionRoleResult(
                role.getId(),
                role.getPerformanceRoleId(),
                performanceRole.getName(),
                performanceRole.getDescription(),
                role.getCondition().getRecruitmentCount(),
                role.getCondition().getGender().name(),
                role.getCondition().getMinimumAge(),
                role.getCondition().getMaximumAge()
        );
    }
}
