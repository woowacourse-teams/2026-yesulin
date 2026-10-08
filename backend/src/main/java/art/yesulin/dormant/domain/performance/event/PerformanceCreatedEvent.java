package art.yesulin.dormant.domain.performance.event;

public record PerformanceCreatedEvent(long performanceId, long ownerId, long posterFileId) {
}
