package art.yesulin.application.file;

public record ReplaceLinkedFileCommand(
        long ownerId,
        long previousFileId,
        long currentFileId,
        String referenceType,
        long referenceId
) {
}
