package art.yesulin.application.recruitment;

import java.time.Instant;
import java.util.List;

public record PerformanceResult(
        long id,
        String title,
        String venue,
        String posterUrl,
        Instant createdAt,
        List<RoleTemplateResult> roleTemplates) {
}
