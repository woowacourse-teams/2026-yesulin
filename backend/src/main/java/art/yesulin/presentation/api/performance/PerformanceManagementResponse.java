package art.yesulin.presentation.api.performance;

import art.yesulin.domain.audition.query.PerformanceManagementResult;
import art.yesulin.domain.audition.query.PerformanceRoleSummary;
import art.yesulin.presentation.api.audition.AuditionManagementResponse;
import java.time.Instant;
import java.util.List;

public record PerformanceManagementResponse(
        long id,
        long posterFileId,
        String posterUrl,
        String title,
        String roadAddress,
        Instant createdAt,
        List<PerformanceRoleSummary> roles,
        int postingCount,
        int openPostingCount,
        int applicantCount,
        int pendingReviewCount,
        List<AuditionManagementResponse> postings
) {

    public PerformanceManagementResponse {
        roles = List.copyOf(roles);
        postings = List.copyOf(postings);
    }

    public static PerformanceManagementResponse from(PerformanceManagementResult result, String posterUrl) {
        return new PerformanceManagementResponse(
                result.id(),
                result.posterFileId(),
                posterUrl,
                result.title(),
                result.roadAddress(),
                result.createdAt(),
                result.roles(),
                result.postingCount(),
                result.openPostingCount(),
                result.applicantCount(),
                result.pendingReviewCount(),
                result.postings().stream().map(AuditionManagementResponse::from).toList()
        );
    }
}
