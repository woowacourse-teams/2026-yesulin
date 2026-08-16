package art.yesulin.domain.file.event;

public record FileReferenceChangedEvent(long ownerId, long previousFileId, long currentFileId) {
}
