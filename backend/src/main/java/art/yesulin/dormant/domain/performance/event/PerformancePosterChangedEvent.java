package art.yesulin.dormant.domain.performance.event;

public record PerformancePosterChangedEvent(
        long performanceId,
        long ownerId,
        long previousPosterFileId,
        long currentPosterFileId
) {
}
