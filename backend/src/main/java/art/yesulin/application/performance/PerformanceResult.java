package art.yesulin.application.performance;

import art.yesulin.domain.performance.Performance;
import java.time.Instant;
import java.util.List;

public record PerformanceResult(
        long id,
        long posterFileId,
        String title,
        String roadAddress,
        Instant createdAt,
        List<PerformanceRoleResult> roles
) {

    public static PerformanceResult from(Performance performance) {
        List<PerformanceRoleResult> roles = performance.getRoles().stream().map(PerformanceRoleResult::from).toList();
        return new PerformanceResult(
                performance.getId(),
                performance.getPosterFileId(),
                performance.getTitle(),
                performance.getRoadAddress(),
                performance.getCreatedAt(),
                roles
        );
    }
}
