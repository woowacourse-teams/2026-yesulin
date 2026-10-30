package art.yesulin.pdfextraction.application.ai;

public record PdfAiRetryRequest(String jobId, int failedAttempts, long failedAt, int generation) {
}
