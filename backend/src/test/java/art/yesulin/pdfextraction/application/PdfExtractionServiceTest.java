package art.yesulin.pdfextraction.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import art.yesulin.global.exception.BusinessException;
import art.yesulin.pdfextraction.domain.PdfExtractionJob;
import art.yesulin.pdfextraction.domain.PdfExtractionJobRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class PdfExtractionServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-23T00:00:00Z");

    private final Map<String, PdfExtractionJob> jobs = new HashMap<>();
    private final FakeStorage storage = new FakeStorage();
    private PdfExtractionJobRepository repository;
    private PdfExtractionService service;

    @BeforeEach
    void setUp() {
        repository = mock(PdfExtractionJobRepository.class);
        when(repository.save(any())).thenAnswer(call -> {
            PdfExtractionJob job = call.getArgument(0);
            jobs.put(job.getId(), job);
            return job;
        });
        when(repository.findByIdAndOwnerId(anyString(), anyLong())).thenAnswer(call ->
                Optional.ofNullable(jobs.get(call.getArgument(0)))
                        .filter(job -> job.getOwnerId() == (long) call.getArgument(1)));
        when(repository.findOwnedForUpdate(anyString(), anyLong())).thenAnswer(call ->
                Optional.ofNullable(jobs.get(call.getArgument(0)))
                        .filter(job -> job.getOwnerId() == (long) call.getArgument(1)));
        when(repository.findTop800ByOwnerIdOrderByCreatedAtDesc(anyLong())).thenAnswer(call ->
                jobs.values().stream().filter(job -> job.getOwnerId() == (long) call.getArgument(0)).toList());
        service = new PdfExtractionService(repository, storage, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @Test
    void anotherOwnerCannotConfirmOrReadAndStorageIsNeverAccessed() {
        String id = service.prepare(1L, "a.pdf", 100).jobId();
        assertThrows(BusinessException.class, () -> service.complete(2L, id));
        assertThrows(BusinessException.class, () -> service.find(2L, id, true));
        assertEquals(0, storage.verifications);
        assertEquals(0, storage.reads);
    }

    @Test
    void failedMetadataVerificationDoesNotConfirmUpload() {
        String id = service.prepare(1L, "a.pdf", 100).jobId();
        storage.rejectUpload = true;
        assertThrows(IllegalArgumentException.class, () -> service.complete(1L, id));
        assertNull(jobs.get(id).getUploadedAt());
        assertEquals("UPLOADING", service.find(1L, id, false).status());
        assertEquals(0, storage.reads);
    }

    @Test
    void existingObjectIsConfirmedAfterUploadUrlExpiredAndRepeatIsIdempotent() {
        String id = service.prepare(1L, "a.pdf", 100).jobId();
        PdfExtractionService later = new PdfExtractionService(repository, storage,
                Clock.offset(Clock.fixed(NOW, ZoneOffset.UTC), Duration.ofDays(1)));
        assertEquals("UPLOAD_EXPIRED", later.find(1L, id, false).status());
        assertEquals("QUEUED", later.complete(1L, id).status());
        assertEquals("QUEUED", later.complete(1L, id).status());
        assertEquals(1, storage.verifications);
    }

    @Test
    void lateCompletionIsNotConfirmedWhenMetadataVerificationFails() {
        String id = service.prepare(1L, "a.pdf", 100).jobId();
        PdfExtractionService later = new PdfExtractionService(repository, storage,
                Clock.offset(Clock.fixed(NOW, ZoneOffset.UTC), Duration.ofDays(1)));
        storage.rejectUpload = true;
        assertThrows(IllegalArgumentException.class, () -> later.complete(1L, id));
        assertNull(jobs.get(id).getUploadedAt());
        assertEquals("UPLOAD_EXPIRED", later.find(1L, id, false).status());
    }

    @Test
    void duplicateCompletionDoesNotRevalidateOrRestartExtraction() {
        String id = service.prepare(1L, "a.pdf", 100).jobId();
        service.complete(1L, id);
        service.complete(1L, id);
        assertEquals(1, storage.verifications);
        assertEquals(0, storage.reads);
    }

    @Test
    void recordsTerminalStatusAndPollingDoesNotReadLargeResultAgain() {
        String id = service.prepare(1L, "a.pdf", 100).jobId();
        service.complete(1L, id);
        storage.result = new PdfExtractionResult("PARTIAL", "abc", "", List.of(), List.of());
        assertEquals("PARTIAL", service.find(1L, id, false).status());
        assertNull(service.find(1L, id, false).result());
        assertEquals(1, storage.reads);
        assertEquals(storage.result, service.find(1L, id, true).result());
        assertEquals(2, storage.reads);
    }

    @Test
    void delayedJobsAreNotMisreportedAsFailedAndListDoesNotSignUrls() {
        String id = service.prepare(1L, "a.pdf", 100).jobId();
        service.complete(1L, id);
        PdfExtractionService later = new PdfExtractionService(repository, storage,
                Clock.offset(Clock.fixed(NOW, ZoneOffset.UTC), Duration.ofMinutes(11)));
        assertEquals("DELAYED", later.find(1L, id, false).status());
        int signedBefore = storage.signedUrls;
        assertEquals(1, later.list(1L).size());
        assertEquals(signedBefore, storage.signedUrls);
    }

    private static class FakeStorage implements PdfExtractionStorage {

        private int verifications;
        private int reads;
        private int signedUrls;
        private boolean rejectUpload;
        private PdfExtractionResult result;

        @Override
        public UploadTarget prepare(PdfExtractionJob job) {
            return new UploadTarget("http://localhost/upload", "PUT", NOW.plusSeconds(600), Map.of());
        }

        @Override
        public void verifySource(PdfExtractionJob job) {
            verifications++;
            if (rejectUpload) {
                throw new IllegalArgumentException("metadata mismatch");
            }
        }

        @Override
        public Optional<PdfExtractionResult> findResult(PdfExtractionJob job) {
            reads++;
            return Optional.ofNullable(result);
        }

        @Override
        public String sourceFileKey(PdfExtractionJob job) {
            return job.getId() + "/source.pdf";
        }

        @Override
        public String resultFileKey(PdfExtractionJob job) {
            return job.getId() + "/result.json";
        }

        @Override
        public String sourceUrl(PdfExtractionJob job) {
            signedUrls++;
            return "http://localhost/source.pdf";
        }
    }
}
