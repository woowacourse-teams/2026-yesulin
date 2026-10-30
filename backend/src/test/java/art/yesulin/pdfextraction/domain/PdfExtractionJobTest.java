package art.yesulin.pdfextraction.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.global.exception.BusinessException;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class PdfExtractionJobTest {

    private static final Instant NOW = Instant.parse("2026-10-23T00:00:00Z");

    @Test
    void rejectsEmptyOversizedAndNonPdfUploads() {
        assertThrows(BusinessException.class, () -> job("a.pdf", 0));
        assertThrows(BusinessException.class, () -> job("a.pdf", PdfExtractionJob.MAX_FILE_BYTES + 1));
        assertThrows(BusinessException.class, () -> job("a.png", 10));
        assertThrows(BusinessException.class, () -> job("a\n.pdf", 10));
    }

    @Test
    void confirmsAfterUploadUrlExpiryAndRepeatingConfirmationIsSafe() {
        PdfExtractionJob job = job("지원서.PDF", 10);
        job.confirmUpload(NOW.plusSeconds(86400));
        job.confirmUpload(NOW.plusSeconds(86500));
        assertEquals(NOW.plusSeconds(86400), job.getUploadedAt());
        assertEquals(PdfExtractionStatus.QUEUED, job.getStatus());
    }

    @Test
    void appliesOnlyTerminalResultsAndKeepsEarlierUploadTime() {
        PdfExtractionJob job = job("a.pdf", 10);
        assertThrows(IllegalArgumentException.class, () -> job.receiveResult("QUEUED", NOW));
        job.confirmUpload(NOW);
        job.receiveResult("PARTIAL", NOW.plusSeconds(30));
        assertEquals(PdfExtractionStatus.PARTIAL, job.getStatus());
        assertEquals(NOW, job.getUploadedAt());
    }

    @Test
    void resultReceivedBeforeUploadConfirmationRecordsUploadTimeAndSurvivesLateConfirmation() {
        PdfExtractionJob job = job("a.pdf", 10);
        job.receiveResult("COMPLETED", NOW.plusSeconds(30));
        job.confirmUpload(NOW.plusSeconds(60));
        assertEquals(NOW.plusSeconds(30), job.getUploadedAt());
        assertEquals(PdfExtractionStatus.COMPLETED, job.getStatus());
    }

    @Test
    void sourceFileMetadataPreservesFilenameAndSizeAndIdentifiesOneStableStorageKey() {
        PdfExtractionJob source = job("  지원서.PDF  ", 100);
        source.identifySource("private/inputs/synthetic/source.pdf");
        source.identifySource("private/inputs/synthetic/source.pdf");
        assertEquals("지원서.PDF", source.getOriginalFilename());
        assertEquals(100L, source.getSize());
        assertEquals(PdfSourceFileType.PDF, source.getFileMetadata().getType());
        assertEquals("pdf", source.getFileMetadata().getExtension());
        assertEquals("application/pdf", source.getFileMetadata().getContentType());
        assertThrows(IllegalArgumentException.class, () -> source.identifySource("different.pdf"));
    }

    private PdfExtractionJob job(String filename, long size) {
        return new PdfExtractionJob(1L, filename, size, NOW, NOW.plusSeconds(600));
    }
}
