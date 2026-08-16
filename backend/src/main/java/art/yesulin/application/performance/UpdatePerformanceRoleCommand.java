package art.yesulin.application.performance;

import art.yesulin.domain.performance.PerformanceRoleChange;

public record UpdatePerformanceRoleCommand(Long id, String name, String description) {

    PerformanceRoleChange toDomain() {
        return new PerformanceRoleChange(id, name, description);
    }
}
