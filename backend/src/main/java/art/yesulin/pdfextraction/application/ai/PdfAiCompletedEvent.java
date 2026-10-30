package art.yesulin.pdfextraction.application.ai;

import art.yesulin.pdfextraction.application.PdfApplicantInfo;

public record PdfAiCompletedEvent(String jobId, long ownerId, String text, PdfApplicantInfo info) {
}
