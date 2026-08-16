package art.yesulin.domain.performance.event;

public record PerformancePosterChangedEvent(long ownerId, long previousPosterFileId, long currentPosterFileId) {
}
