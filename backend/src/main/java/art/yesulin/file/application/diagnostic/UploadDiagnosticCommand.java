package art.yesulin.file.application.diagnostic;

public record UploadDiagnosticCommand(
        UploadFlow uploadFlow,
        UploadStage stage,
        int attempt,
        UploadDiagnosticResult result,
        UploadErrorCode errorCode,
        Integer httpStatus,
        boolean serviceWorkerControlled,
        CoarsePlatform coarsePlatform,
        CoarseBrowser coarseBrowser
) {
}
