package art.yesulin.application.recruitment;

import java.time.LocalDateTime;

public record PostingCommand(
        String title,
        String status,
        boolean allowsMultipleRoles,
        LocalDateTime recruitmentStartsAt,
        LocalDateTime recruitmentEndsAt,
        String applicationGuide) {
}
