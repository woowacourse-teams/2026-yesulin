package art.yesulin.application.recruitment;

import java.time.LocalDateTime;

public record PostingResult(
        long id,
        long performanceId,
        String title,
        String status,
        boolean allowsMultipleRoles,
        LocalDateTime recruitmentStartsAt,
        LocalDateTime recruitmentEndsAt,
        String applicationGuide) {
}
