package art.yesulin.operation.application.log;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record OtrRedirectReport(
        String environment,
        LocalDate startDate,
        LocalDate endDate,
        long totalClicks,
        List<OtrRedirectCount> links,
        boolean available,
        boolean truncated,
        Instant readAt
) {
}
