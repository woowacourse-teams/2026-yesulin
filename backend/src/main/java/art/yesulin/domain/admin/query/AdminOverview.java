package art.yesulin.domain.admin.query;

/**
 * 대시보드 첫 화면의 집계다. 개인 식별 정보는 담지 않는다.
 */
public record AdminOverview(
        long applicants,
        long producers,
        long pendingProducers,
        long activeProducers,
        long performances,
        long auditions,
        long draftAuditions,
        long publishedAuditions,
        long closedAuditions,
        long submissions,
        long newProducersInLastWeek,
        long newSubmissionsInLastWeek
) {
}
