package art.yesulin.presentation.api.performance;

import art.yesulin.application.performance.PerformanceResult;
import art.yesulin.application.performance.PerformanceRoleResult;
import java.time.Instant;
import java.util.List;

public record PerformanceResponse(
        long id,
        long posterFileId,
        String posterUrl,
        String title,
        String venue,
        String roadAddress,
        PerformanceVenueAddressResponse venueAddress,
        Instant createdAt,
        List<PerformanceRoleResult> roles
) {

    public static PerformanceResponse from(PerformanceResult result, String posterUrl) {
        return new PerformanceResponse(
                result.id(),
                result.posterFileId(),
                posterUrl,
                result.title(),
                result.venue(),
                result.roadAddress(),
                PerformanceVenueAddressResponse.from(result),
                result.createdAt(),
                result.roles()
        );
    }
}
