package art.yesulin.pdfextraction.application;

import tools.jackson.databind.JsonNode;

public record ReceivePdfExtractionResultCommand(
        String jobId,
        String sourceFileKey,
        String pipelineVersion,
        JsonNode result
) {
}
