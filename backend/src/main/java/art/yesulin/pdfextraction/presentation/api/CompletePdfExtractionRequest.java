package art.yesulin.pdfextraction.presentation.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import tools.jackson.databind.JsonNode;

public record CompletePdfExtractionRequest(
        @NotNull UUID jobId,
        @NotBlank String sourceFileKey,
        @NotBlank String pipelineVersion,
        @NotNull JsonNode result
) {
}
