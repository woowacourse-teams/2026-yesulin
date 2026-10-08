package art.yesulin.file.application;

public record LinkFileCommand(
        long ownerId,
        long fileId,
        String referenceType,
        long referenceId
) {
}
