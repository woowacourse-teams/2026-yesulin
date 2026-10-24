package art.yesulin.pdfextraction.application;

public record PdfExtractionCompletedEvent(String jobId, long ownerId, String text) {
}
