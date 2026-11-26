package art.yesulin.pdfextraction.application;

import art.yesulin.pdfextraction.domain.DocumentPreviewStatus;

public record DocumentPreviewCompletion(String jobId, String originalFileKey, String originalSha256,
                                        DocumentPreviewStatus status, String previewSha256) {
}
