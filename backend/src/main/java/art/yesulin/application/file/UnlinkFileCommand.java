package art.yesulin.application.file;

public record UnlinkFileCommand(
        long fileId,
        String referenceType,
        long referenceId
) {
}
