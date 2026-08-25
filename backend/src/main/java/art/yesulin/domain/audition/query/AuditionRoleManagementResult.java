package art.yesulin.domain.audition.query;

public record AuditionRoleManagementResult(
        long id,
        long performanceRoleId,
        String name,
        String description,
        int recruitmentCount,
        String gender,
        int minimumAge,
        int maximumAge,
        int applicantCount,
        int activeRound,
        boolean allRoundsClosed,
        ReviewProgressResult progress,
        ReviewCountsResult counts
) {
}
