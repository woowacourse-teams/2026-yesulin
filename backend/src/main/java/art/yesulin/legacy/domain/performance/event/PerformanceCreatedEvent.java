package art.yesulin.legacy.domain.performance.event;

public record PerformanceCreatedEvent(long performanceId, long ownerId, long posterFileId) {
}
