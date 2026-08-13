package art.yesulin.application.recruitment;

import java.time.Instant;
import java.util.List;

public record PostingResult(
        long id,
        long performanceId,
        String title,
        String status,
        boolean allowsMultipleRoles,
        Instant recruitmentStartsAt,
        Instant recruitmentEndsAt,
        String applicationGuide,
        List<RoleResult> roles,
        List<ScreeningRoundResult> rounds,
        List<PostingFieldResult> applicationFields) {
}
