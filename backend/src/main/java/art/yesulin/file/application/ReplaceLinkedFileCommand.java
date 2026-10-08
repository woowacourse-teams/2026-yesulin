package art.yesulin.file.application;

public record ReplaceLinkedFileCommand(
        long ownerId,
        long previousFileId,
        long currentFileId,
        String referenceType,
        long referenceId
) {
}
