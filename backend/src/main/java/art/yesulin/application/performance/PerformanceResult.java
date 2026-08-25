package art.yesulin.application.performance;

import art.yesulin.domain.performance.Performance;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record PerformanceResult(
        long id,
        long posterFileId,
        String title,
        String venue,
        String roadAddress,
        String detailAddress,
        String zonecode,
        BigDecimal latitude,
        BigDecimal longitude,
        Instant createdAt,
        List<PerformanceRoleResult> roles
) {

    public static PerformanceResult from(Performance performance) {
        List<PerformanceRoleResult> roles = performance.getRoles().stream().map(PerformanceRoleResult::from).toList();
        return new PerformanceResult(
                performance.getId(),
                performance.getPosterFileId(),
                performance.getTitle(),
                performance.getVenue().getName(),
                performance.getRoadAddress(),
                performance.getVenue().getDetailAddress(),
                performance.getVenue().getZonecode(),
                performance.getVenue().getLatitude(),
                performance.getVenue().getLongitude(),
                performance.getCreatedAt(),
                roles
        );
    }
}
