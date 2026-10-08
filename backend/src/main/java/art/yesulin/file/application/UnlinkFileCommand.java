package art.yesulin.file.application;

public record UnlinkFileCommand(
        long fileId,
        String referenceType,
        long referenceId
) {
}
