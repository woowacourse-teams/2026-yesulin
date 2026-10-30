package art.yesulin.pdfextraction.application.ai;

public record PdfAiFailureNotice(String jobId, String model, String errorCode, int attempts,
                                 long failedAt, int generation, boolean retryAllowed) {
}
