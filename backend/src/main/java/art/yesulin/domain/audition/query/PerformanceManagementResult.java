package art.yesulin.domain.audition.query;

import java.time.Instant;
import java.util.List;

public record PerformanceManagementResult(
        long id,
        long posterFileId,
        String title,
        String roadAddress,
        Instant createdAt,
        List<PerformanceRoleSummary> roles,
        int postingCount,
        int openPostingCount,
        int applicantCount,
        int pendingReviewCount,
        List<AuditionManagementResult> postings
) {

    public PerformanceManagementResult {
        roles = List.copyOf(roles);
        postings = List.copyOf(postings);
    }
}
