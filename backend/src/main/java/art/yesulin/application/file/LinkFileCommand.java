package art.yesulin.application.file;

public record LinkFileCommand(
        long ownerId,
        long fileId,
        String referenceType,
        long referenceId
) {
}
