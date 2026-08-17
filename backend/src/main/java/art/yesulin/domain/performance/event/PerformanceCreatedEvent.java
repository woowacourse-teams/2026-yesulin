package art.yesulin.domain.performance.event;

public record PerformanceCreatedEvent(long performanceId, long ownerId, long posterFileId) {
}
