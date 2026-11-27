package art.yesulin.pdfextraction.application;

import art.yesulin.pdfextraction.domain.DocumentPreviewStatus;
import art.yesulin.pdfextraction.domain.PdfExtractionJob;
import java.time.Instant;

public record PdfExtractionView(
        String jobId,
        String originalFilename,
        String extension,
        long size,
        Instant createdAt,
        Instant uploadedAt,
        String status,
        String sourceFileKey,
        String resultFileKey,
        String sourceUrl,
        String originalUrl,
        DocumentPreviewStatus previewStatus,
        PdfExtractionResult result
) {

    public static PdfExtractionView of(PdfExtractionJob job, String status, PdfExtractionStorage storage,
                                       PdfExtractionResult result) {
        return of(job, status, storage, result, true);
    }

    public static PdfExtractionView of(PdfExtractionJob job, String status, PdfExtractionStorage storage,
                                       PdfExtractionResult result, boolean includeUrl) {
        String previewUrl = null;
        String originalUrl = null;
        if (includeUrl && job.getUploadedAt() != null) {
            originalUrl = storage.originalDownloadUrl(job);
            if (job.previewStatus() == DocumentPreviewStatus.READY) {
                previewUrl = storage.sourceUrl(job);
            }
        }
        return new PdfExtractionView(job.getId(), job.getOriginalFilename(), job.getFileMetadata().getExtension(),
                job.getSize(), job.getCreatedAt(),
                job.getUploadedAt(), status, storage.sourceFileKey(job), storage.resultFileKey(job),
                previewUrl, originalUrl, job.previewStatus(), result);
    }
}
