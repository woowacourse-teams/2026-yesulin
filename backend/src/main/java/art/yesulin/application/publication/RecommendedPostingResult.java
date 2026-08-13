package art.yesulin.application.publication;

import java.time.Instant;

public record RecommendedPostingResult(
        long id,
        String performanceTitle,
        String title,
        String companyName,
        String status,
        Instant recruitmentStartsAt,
        Instant recruitmentEndsAt) {
}
