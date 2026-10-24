package art.yesulin.pdfextraction.application;

import art.yesulin.pdfextraction.domain.PdfExtractionJob;
import java.time.Instant;

public record PdfExtractionView(
        String jobId,
        String originalFilename,
        long size,
        Instant createdAt,
        Instant uploadedAt,
        String status,
        String sourceFileKey,
        String resultFileKey,
        String sourceUrl,
        PdfExtractionResult result
) {

    public static PdfExtractionView of(PdfExtractionJob job, String status, PdfExtractionStorage storage,
                                       PdfExtractionResult result) {
        return of(job, status, storage, result, true);
    }

    public static PdfExtractionView of(PdfExtractionJob job, String status, PdfExtractionStorage storage,
                                       PdfExtractionResult result, boolean includeUrl) {
        return new PdfExtractionView(job.getId(), job.getOriginalFilename(), job.getSize(), job.getCreatedAt(),
                job.getUploadedAt(), status, storage.sourceFileKey(job), storage.resultFileKey(job),
                !includeUrl || job.getUploadedAt() == null ? null : storage.sourceUrl(job), result);
    }
}
