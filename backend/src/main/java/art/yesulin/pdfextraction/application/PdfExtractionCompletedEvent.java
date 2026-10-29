package art.yesulin.pdfextraction.application;

public record PdfExtractionCompletedEvent(String jobId, long ownerId, String text, PdfApplicantInfo applicantInfo) {

    public PdfExtractionCompletedEvent(String jobId, long ownerId, String text) {
        this(jobId, ownerId, text, null);
    }
}
