package art.yesulin.presentation.api.diagnostic;

import art.yesulin.application.diagnostic.CoarseBrowser;
import art.yesulin.application.diagnostic.CoarsePlatform;
import art.yesulin.application.diagnostic.UploadDiagnosticCommand;
import art.yesulin.application.diagnostic.UploadDiagnosticResult;
import art.yesulin.application.diagnostic.UploadErrorCode;
import art.yesulin.application.diagnostic.UploadFlow;
import art.yesulin.application.diagnostic.UploadStage;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record UploadDiagnosticRequest(
        @NotNull UploadFlow uploadFlow,
        @NotNull UploadStage stage,
        @Min(1) @Max(2) int attempt,
        @NotNull UploadDiagnosticResult result,
        @NotNull UploadErrorCode errorCode,
        @Min(100) @Max(599) Integer httpStatus,
        boolean serviceWorkerControlled,
        @NotNull CoarsePlatform coarsePlatform,
        @NotNull CoarseBrowser coarseBrowser
) {

    UploadDiagnosticCommand toCommand() {
        return new UploadDiagnosticCommand(
                uploadFlow,
                stage,
                attempt,
                result,
                errorCode,
                httpStatus,
                serviceWorkerControlled,
                coarsePlatform,
                coarseBrowser
        );
    }
}
