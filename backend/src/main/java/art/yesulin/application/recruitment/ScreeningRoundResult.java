package art.yesulin.application.recruitment;

import java.time.Instant;
import java.time.LocalDate;

public record ScreeningRoundResult(
        long id,
        long roleId,
        int round,
        String name,
        LocalDate date,
        String note,
        String status,
        Instant closedAt) {
}
