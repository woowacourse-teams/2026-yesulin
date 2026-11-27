package art.yesulin.pdfextraction.presentation.api;

import art.yesulin.pdfextraction.application.DocumentPreviewCompletion;
import art.yesulin.pdfextraction.domain.DocumentPreviewStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record CompleteDocumentPreviewRequest(
        @NotNull UUID jobId,
        @NotBlank @Size(max = 1024) String originalFileKey,
        @NotNull @Pattern(regexp = "[0-9a-f]{64}") String originalSha256,
        @NotNull DocumentPreviewStatus status,
        @Pattern(regexp = "[0-9a-f]{64}") String previewSha256
) {

    public DocumentPreviewCompletion toCommand() {
        return new DocumentPreviewCompletion(jobId.toString(), originalFileKey, originalSha256, status, previewSha256);
    }
}
