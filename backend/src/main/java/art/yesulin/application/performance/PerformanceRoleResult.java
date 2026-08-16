package art.yesulin.application.performance;

import art.yesulin.domain.performance.PerformanceRole;

public record PerformanceRoleResult(long id, String name, String description) {

    static PerformanceRoleResult from(PerformanceRole role) {
        return new PerformanceRoleResult(role.getId(), role.getName(), role.getDescription());
    }
}
