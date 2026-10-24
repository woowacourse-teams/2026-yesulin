package art.yesulin.pdfextraction.application;

import static art.yesulin.pdfextraction.application.PdfExtractionFixtures.MAPPER;
import static art.yesulin.pdfextraction.application.PdfExtractionFixtures.NOW;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import art.yesulin.global.exception.BusinessException;
import art.yesulin.pdfextraction.domain.PdfExtractionJob;
import art.yesulin.pdfextraction.domain.PdfExtractionJobRepository;
import art.yesulin.pdfextraction.domain.PdfExtractionPayload;
import art.yesulin.pdfextraction.domain.PdfExtractionPayloadRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class PdfExtractionServiceTest {

    private final Map<String, PdfExtractionJob> jobs = new HashMap<>();
    private final Map<String, PdfExtractionPayload> storedPayloads = new HashMap<>();
    private final FakePdfExtractionStorage storage = new FakePdfExtractionStorage();
    private PdfExtractionJobRepository repository;
    private PdfExtractionPayloadRepository payloads;
    private PdfExtractionService service;

    @BeforeEach
    void setUp() {
        repository = mock(PdfExtractionJobRepository.class);
        payloads = mock(PdfExtractionPayloadRepository.class);
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
        when(payloads.findById(anyString())).thenAnswer(call ->
                Optional.ofNullable(storedPayloads.get(call.getArgument(0))));
        service = serviceAt(Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @Test
    void anotherOwnerCannotConfirmOrReadAndStorageIsNeverAccessed() {
        String id = service.prepare(1L, "a.pdf", 100).jobId();
        assertThrows(BusinessException.class, () -> service.complete(2L, id));
        assertThrows(BusinessException.class, () -> service.find(2L, id, true));
        assertEquals(0, storage.verifications());
        verify(payloads, never()).findById(anyString());
    }

    @Test
    void failedMetadataVerificationDoesNotConfirmUpload() {
        String id = service.prepare(1L, "a.pdf", 100).jobId();
        storage.rejectUpload();
        assertThrows(IllegalArgumentException.class, () -> service.complete(1L, id));
        assertNull(jobs.get(id).getUploadedAt());
        assertEquals("UPLOADING", service.find(1L, id, false).status());
    }

    @Test
    void existingObjectIsConfirmedAfterUploadUrlExpiredAndRepeatIsIdempotent() {
        String id = service.prepare(1L, "a.pdf", 100).jobId();
        PdfExtractionService later = serviceAt(Clock.offset(Clock.fixed(NOW, ZoneOffset.UTC), Duration.ofDays(1)));
        assertEquals("UPLOAD_EXPIRED", later.find(1L, id, false).status());
        assertEquals("QUEUED", later.complete(1L, id).status());
        assertEquals("QUEUED", later.complete(1L, id).status());
        assertEquals(1, storage.verifications());
    }

    @Test
    void lateCompletionIsNotConfirmedWhenMetadataVerificationFails() {
        String id = service.prepare(1L, "a.pdf", 100).jobId();
        PdfExtractionService later = serviceAt(Clock.offset(Clock.fixed(NOW, ZoneOffset.UTC), Duration.ofDays(1)));
        storage.rejectUpload();
        assertThrows(IllegalArgumentException.class, () -> later.complete(1L, id));
        assertNull(jobs.get(id).getUploadedAt());
        assertEquals("UPLOAD_EXPIRED", later.find(1L, id, false).status());
    }

    @Test
    void duplicateCompletionDoesNotRevalidateOrRestartExtraction() {
        String id = service.prepare(1L, "a.pdf", 100).jobId();
        service.complete(1L, id);
        service.complete(1L, id);
        assertEquals(1, storage.verifications());
        verify(payloads, never()).findById(anyString());
    }

    @Test
    void completionAfterCallbackKeepsFinalStatusAndSkipsSourceVerification() {
        String id = service.prepare(1L, "a.pdf", 100).jobId();
        jobs.get(id).receiveResult("COMPLETED", NOW.plusSeconds(30));
        PdfExtractionView view = service.complete(1L, id);
        assertEquals("COMPLETED", view.status());
        assertEquals(NOW.plusSeconds(30), view.uploadedAt());
        assertEquals(0, storage.verifications());
    }

    @Test
    void detailReadsStoredPayloadAndSignsOnlyAtReadTimeWhilePollingReadsNothing() throws Exception {
        String id = service.prepare(1L, "a.pdf", 100).jobId();
        service.complete(1L, id);
        jobs.get(id).receiveResult("PARTIAL", NOW);
        PdfExtractionResult stored = new PdfExtractionResult("PARTIAL", "abc", "", List.of("LOW_TEXT (1쪽)"),
                List.of(new PdfExtractionResult.Page(1, "본문", false,
                        List.of(new PdfExtractionResult.Image(storage.imageFileKeyPrefix(jobs.get(id)) + "p1.png",
                                null, "UNCLASSIFIED")))));
        storedPayloads.put(id, new PdfExtractionPayload(id, MAPPER.writeValueAsString(stored), "digest", NOW));

        assertEquals("PARTIAL", service.find(1L, id, false).status());
        assertNull(service.find(1L, id, false).result());
        assertEquals(0, storage.signedUrls());
        verify(payloads, never()).findById(anyString());

        PdfExtractionView detail = service.find(1L, id, true);
        assertEquals(stored.warnings(), detail.result().warnings());
        assertEquals("본문", detail.result().pages().get(0).text());
        assertEquals("http://localhost/" + stored.pages().get(0).images().get(0).fileKey(),
                detail.result().pages().get(0).images().get(0).url());
        assertNotNull(detail.sourceUrl());
    }

    @Test
    void unfinishedJobDetailHasNoResultEvenWhenRequested() {
        String id = service.prepare(1L, "a.pdf", 100).jobId();
        service.complete(1L, id);
        PdfExtractionView detail = service.find(1L, id, true);
        assertEquals("QUEUED", detail.status());
        assertNull(detail.result());
        verify(payloads, never()).findById(anyString());
    }

    @Test
    void delayedJobsAreNotMisreportedAsFailedAndListDoesNotSignUrls() {
        String id = service.prepare(1L, "a.pdf", 100).jobId();
        service.complete(1L, id);
        PdfExtractionService later = serviceAt(Clock.offset(Clock.fixed(NOW, ZoneOffset.UTC), Duration.ofMinutes(11)));
        assertEquals("DELAYED", later.find(1L, id, false).status());
        int signedBefore = storage.signedUrls();
        assertEquals(1, later.list(1L).size());
        assertEquals(signedBefore, storage.signedUrls());
    }

    private PdfExtractionService serviceAt(Clock clock) {
        return new PdfExtractionService(repository, payloads, storage, MAPPER, clock);
    }
}
