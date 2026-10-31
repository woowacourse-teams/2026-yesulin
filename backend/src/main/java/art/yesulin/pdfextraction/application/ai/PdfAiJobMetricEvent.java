package art.yesulin.pdfextraction.application.ai;

public record PdfAiJobMetricEvent(String jobId, int generation, String modelId, String outcome,
                                  int attempts, long elapsedMs, boolean escalated) {
}
