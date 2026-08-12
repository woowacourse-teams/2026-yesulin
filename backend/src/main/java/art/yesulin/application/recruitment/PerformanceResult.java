package art.yesulin.application.recruitment;

import java.time.LocalDateTime;

public record PerformanceResult(
        long id, String title, String venue, String posterUrl, LocalDateTime createdAt) {
}
