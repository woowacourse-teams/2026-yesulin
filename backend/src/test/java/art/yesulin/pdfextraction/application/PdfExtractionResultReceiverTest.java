package art.yesulin.pdfextraction.application;

import static art.yesulin.pdfextraction.application.PdfExtractionFixtures.MAPPER;
import static art.yesulin.pdfextraction.application.PdfExtractionFixtures.NOW;
import static art.yesulin.pdfextraction.application.PdfExtractionFixtures.command;
import static art.yesulin.pdfextraction.application.PdfExtractionFixtures.image;
import static art.yesulin.pdfextraction.application.PdfExtractionFixtures.images;
import static art.yesulin.pdfextraction.application.PdfExtractionFixtures.job;
import static art.yesulin.pdfextraction.application.PdfExtractionFixtures.manifest;
import static art.yesulin.pdfextraction.application.PdfExtractionFixtures.page;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import art.yesulin.global.exception.BusinessException;
import art.yesulin.pdfextraction.domain.PdfExtractionJob;
import art.yesulin.pdfextraction.domain.PdfExtractionJobRepository;
import art.yesulin.pdfextraction.domain.PdfExtractionPayload;
import art.yesulin.pdfextraction.domain.PdfExtractionPayloadRepository;
import art.yesulin.pdfextraction.domain.PdfExtractionStatus;
import java.time.Clock;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import tools.jackson.databind.node.ObjectNode;

class PdfExtractionResultReceiverTest {

    private final Map<String, PdfExtractionJob> jobs = new HashMap<>();
    private final Map<String, PdfExtractionPayload> storedPayloads = new HashMap<>();
    private final List<Object> events = new ArrayList<>();
    private final FakePdfExtractionStorage storage = new FakePdfExtractionStorage();
    private PdfExtractionPayloadRepository payloads;
    private PdfExtractionJobRepository repository;
    private PdfExtractionResultReceiver receiver;
    private PdfExtractionJob job;

    @BeforeEach
    void setUp() {
        repository = mock(PdfExtractionJobRepository.class);
        payloads = mock(PdfExtractionPayloadRepository.class);
        when(repository.findForUpdate(anyString())).thenAnswer(call ->
                Optional.ofNullable(jobs.get(call.getArgument(0))));
        when(repository.findOwnedForUpdate(anyString(), anyLong(), any())).thenAnswer(call ->
                Optional.ofNullable(jobs.get(call.getArgument(0))));
        when(payloads.findById(anyString())).thenAnswer(call ->
                Optional.ofNullable(storedPayloads.get(call.getArgument(0))));
        when(payloads.save(any())).thenAnswer(call -> {
            PdfExtractionPayload payload = call.getArgument(0);
            storedPayloads.put(payload.getJobId(), payload);
            return payload;
        });
        receiver = receiverPublishingTo(events::add);
        job = job(7L);
        jobs.put(job.getId(), job);
    }

    @Test
    void firstReceiptStoresPayloadWithoutTemporaryUrlsAndPublishesEventForJobOwner() {
        PdfExtractionResultReceiver.Receipt receipt = receiver.receive(command(job, storage,
                manifest(job, storage, "COMPLETED", "첫 쪽", "둘째 쪽")));

        assertEquals("COMPLETED", receipt.status());
        assertEquals(PdfExtractionStatus.COMPLETED, job.getStatus());
        assertEquals(NOW, job.getUploadedAt());
        PdfExtractionPayload payload = storedPayloads.get(job.getId());
        assertFalse(payload.getPayloadJson().contains("temporary.example"));
        assertFalse(payload.getPayloadJson().contains("signature"));
        assertEquals(64, payload.getPayloadSha256().length());
        assertEquals(List.of(new PdfExtractionCompletedEvent(job.getId(), 7L, "첫 쪽\n\n둘째 쪽")), events);
    }

    @Test
    void resultArrivingBeforeFrontendCompletionRecordsUploadWithoutReadingSource() {
        assertNull(job.getUploadedAt());
        receiver.receive(command(job, storage, manifest(job, storage, "PARTIAL", "본문")));
        assertEquals(NOW, job.getUploadedAt());
        assertEquals(PdfExtractionStatus.PARTIAL, job.getStatus());
        assertEquals(0, storage.verifications());
    }

    @Test
    void identicalPayloadIsAcceptedAgainWithoutPublishingOrSavingAgain() {
        ObjectNode manifest = manifest(job, storage, "COMPLETED", "본문");
        receiver.receive(command(job, storage, manifest));
        ObjectNode retried = manifest.deepCopy();
        ((ObjectNode) images(retried, 0).get(0)).put("url", "https://temporary.example/other");

        PdfExtractionResultReceiver.Receipt receipt = receiver.receive(command(job, storage, retried));

        assertEquals("COMPLETED", receipt.status());
        assertEquals(1, events.size());
        verify(payloads, times(1)).save(any());
    }

    @Test
    void differentPayloadForSameJobConflictsAndKeepsStoredResult() {
        receiver.receive(command(job, storage, manifest(job, storage, "COMPLETED", "본문")));
        String stored = storedPayloads.get(job.getId()).getPayloadJson();

        BusinessException exception = assertThrows(BusinessException.class, () ->
                receiver.receive(command(job, storage, manifest(job, storage, "COMPLETED", "다른 본문"))));

        assertEquals("PDF_EXTRACTION_RESULT_CONFLICT", exception.getErrorCode().code());
        assertEquals(stored, storedPayloads.get(job.getId()).getPayloadJson());
        assertEquals(1, events.size());
    }

    @Test
    void applicantInfoIsStoredInThePayloadAndCarriedByTheEvent() {
        ObjectNode manifest = withApplicantInfo(manifest(job, storage, "COMPLETED", "본문"), "홍길동");

        receiver.receive(command(job, storage, manifest));

        PdfExtractionCompletedEvent event = (PdfExtractionCompletedEvent) events.get(0);
        assertEquals("홍길동", event.applicantInfo().applicantName());
        assertTrue(storedPayloads.get(job.getId()).getPayloadJson().contains("\"applicantName\":\"홍길동\""));
    }

    @Test
    void resultWithoutApplicantInfoKeepsTheLegacyPayloadShape() {
        receiver.receive(command(job, storage, manifest(job, storage, "COMPLETED", "본문")));

        assertFalse(storedPayloads.get(job.getId()).getPayloadJson().contains("applicantInfo"));
        assertNull(((PdfExtractionCompletedEvent) events.get(0)).applicantInfo());
    }

    @Test
    void duplicateCallbackWithSameApplicantInfoIsStableAndDifferentOneConflicts() {
        receiver.receive(command(job, storage, withApplicantInfo(manifest(job, storage, "COMPLETED", "본문"), "홍길동")));

        receiver.receive(command(job, storage, withApplicantInfo(manifest(job, storage, "COMPLETED", "본문"), "홍길동")));
        BusinessException exception = assertThrows(BusinessException.class, () -> receiver.receive(command(job, storage,
                withApplicantInfo(manifest(job, storage, "COMPLETED", "본문"), "김철수"))));

        assertEquals("PDF_EXTRACTION_RESULT_CONFLICT", exception.getErrorCode().code());
        assertEquals(1, events.size());
    }

    @Test
    void malformedApplicantInfoIsRejectedBeforeAnythingIsStored() {
        ObjectNode manifest = manifest(job, storage, "COMPLETED", "본문");
        manifest.putObject("applicantInfo").put("version", "applicant-info-v1").put("status", "MAYBE");

        assertInvalid(command(job, storage, manifest));
        verify(payloads, never()).save(any());
        assertTrue(events.isEmpty());
    }

    @Test
    void failedResultPublishesCompletionSoWaitingScreensCanUpdate() {
        receiver.receive(command(job, storage, manifest(job, storage, "FAILED")));
        assertEquals(PdfExtractionStatus.FAILED, job.getStatus());
        assertTrue(storedPayloads.containsKey(job.getId()));
        assertEquals(List.of(new PdfExtractionCompletedEvent(job.getId(), 7L, "")), events);
    }

    @Test
    void unknownJobIsNotFoundAndNothingIsStored() {
        PdfExtractionJob unknown = job(7L);
        BusinessException exception = assertThrows(BusinessException.class, () ->
                receiver.receive(command(unknown, storage, manifest(unknown, storage, "COMPLETED", "본문"))));
        assertEquals("PDF_EXTRACTION_NOT_FOUND", exception.getErrorCode().code());
        verify(payloads, never()).save(any());
    }

    @Test
    void mismatchedIdentityIsRejectedBeforeAnythingIsStored() {
        ObjectNode wrongJob = manifest(job, storage, "COMPLETED", "본문").put("jobId", job(7L).getId());
        ObjectNode wrongPipeline = manifest(job, storage, "COMPLETED", "본문").put("pipelineVersion", "other");
        ObjectNode wrongSource = manifest(job, storage, "COMPLETED", "본문");
        ((ObjectNode) wrongSource.get("source")).put("key", "yesulin/inputs/other/source.pdf");
        ObjectNode wrongStatus = manifest(job, storage, "COMPLETED", "본문").put("status", "QUEUED");

        for (ObjectNode manifest : List.of(wrongJob, wrongPipeline, wrongSource, wrongStatus)) {
            assertInvalid(command(job, storage, manifest));
        }
        assertInvalid(new ReceivePdfExtractionResultCommand(job.getId(), "yesulin/inputs/other/source.pdf",
                "pdfium-v1", manifest(job, storage, "COMPLETED", "본문")));
        assertInvalid(new ReceivePdfExtractionResultCommand(job.getId(), storage.sourceFileKey(job),
                "other", manifest(job, storage, "COMPLETED", "본문")));
        assertInvalid(new ReceivePdfExtractionResultCommand(job.getId(), storage.sourceFileKey(job),
                "pdfium-v1", null));
        verify(payloads, never()).save(any());
        assertTrue(events.isEmpty());
        assertEquals(PdfExtractionStatus.UPLOADING, job.getStatus());
    }

    @Test
    void imageKeyOutsideJobPrefixOrWithUnsafeNameIsRejected() {
        for (String key : List.of(
                "yesulin/results/other/pdfium-v1/images/p1.png",
                storage.imageFileKeyPrefix(job) + "../p1.png",
                storage.imageFileKeyPrefix(job) + "p1.jpg",
                storage.imageFileKeyPrefix(job) + "nested/p1.png")) {
            ObjectNode manifest = manifest(job, storage, "COMPLETED", "본문");
            images(manifest, 0).removeAll();
            images(manifest, 0).add(image(key));
            assertInvalid(command(job, storage, manifest));
        }
    }

    @Test
    void pageImageTextAndSizeLimitsAreEnforced() {
        String[] fiftyOnePages = Collections.nCopies(51, "쪽").toArray(String[]::new);
        assertInvalid(command(job, storage, manifest(job, storage, "COMPLETED", fiftyOnePages)));

        ObjectNode tooManyImages = manifest(job, storage, "COMPLETED", "본문");
        for (int index = 0; index < 100; index++) {
            images(tooManyImages, 0).add(image(storage.imageFileKeyPrefix(job) + "extra" + index + ".png"));
        }
        assertInvalid(command(job, storage, tooManyImages));

        assertInvalid(command(job, storage, manifest(job, storage, "COMPLETED", "가".repeat(500_001))));

        ObjectNode tooLarge = manifest(job, storage, "COMPLETED", "본문");
        tooLarge.putArray("warnings").add("x".repeat(PdfExtractionResultParser.MAX_RESULT_BYTES));
        assertInvalid(command(job, storage, tooLarge));
        verify(payloads, never()).save(any());
    }

    @Test
    void pageTextLimitAcceptsExactlyTheWorkerMaximum() {
        receiver.receive(command(job, storage, manifest(job, storage, "COMPLETED", "가".repeat(100_000))));
        assertEquals(1, events.size());
    }

    @Test
    void acceptsLargeTextAcrossPagesWhenTheManifestIsWithinTheWorkerLimit() {
        String[] pages = Collections.nCopies(6, "a".repeat(100_000)).toArray(String[]::new);
        receiver.receive(command(job, storage, manifest(job, storage, "COMPLETED", pages)));
        assertEquals(1, events.size());
    }

    @Test
    void duplicateOrNonPositivePageNumbersAreRejected() {
        ObjectNode duplicated = manifest(job, storage, "COMPLETED", "하나", "둘");
        page(duplicated, 1).put("number", 1);
        assertInvalid(command(job, storage, duplicated));
        ObjectNode zero = manifest(job, storage, "COMPLETED", "하나");
        page(zero, 0).put("number", 0);
        assertInvalid(command(job, storage, zero));
    }

    @Test
    void pagesAreJoinedInPageNumberOrderAndWarningObjectsBecomeText() {
        ObjectNode manifest = manifest(job, storage, "COMPLETED", "둘째", "첫째");
        page(manifest, 0).put("number", 2);
        page(manifest, 1).put("number", 1);

        receiver.receive(command(job, storage, manifest));

        assertEquals("첫째\n\n둘째", ((PdfExtractionCompletedEvent) events.get(0)).text());
        assertTrue(storedPayloads.get(job.getId()).getPayloadJson().contains("LOW_TEXT (1쪽)"));
    }

    @Test
    void eventListenerFailurePropagatesSoTheSurroundingTransactionCanRollBack() {
        PdfExtractionResultReceiver failing = receiverPublishingTo(event -> {
            throw new IllegalStateException("review failed");
        });
        assertThrows(IllegalStateException.class, () ->
                failing.receive(command(job, storage, manifest(job, storage, "COMPLETED", "본문"))));
    }

    @Test
    void lateFrontendCompletionDoesNotOverwriteFinalStatus() {
        receiver.receive(command(job, storage, manifest(job, storage, "COMPLETED", "본문")));
        PdfExtractionService service = new PdfExtractionService(repository, payloads, storage, MAPPER,
                Clock.fixed(NOW.plusSeconds(60), ZoneOffset.UTC),
                mock(art.yesulin.pdfextraction.domain.ai.PdfAiJobRepository.class), event -> {});

        PdfExtractionView view = service.complete(7L, job.getId());

        assertEquals("COMPLETED", view.status());
        assertEquals(NOW, view.uploadedAt());
        assertEquals(0, storage.verifications());
    }

    private PdfExtractionResultReceiver receiverPublishingTo(ApplicationEventPublisher publisher) {
        return new PdfExtractionResultReceiver(repository, payloads,
                new PdfExtractionResultParser(storage, MAPPER), storage, publisher, MAPPER,
                Clock.fixed(NOW, ZoneOffset.UTC),
                mock(art.yesulin.pdfextraction.application.ai.PdfAiQueueService.class));
    }

    private ObjectNode withApplicantInfo(ObjectNode manifest, String name) {
        manifest.putObject("applicantInfo").put("version", "applicant-info-v1").put("status", "COMPLETED")
                .put("provider", "bedrock").put("model", "model-1").put("applicantName", name)
                .put("applicantNameEvidence", name);
        return manifest;
    }

    private void assertInvalid(ReceivePdfExtractionResultCommand command) {
        BusinessException exception = assertThrows(BusinessException.class, () -> receiver.receive(command));
        assertEquals("INVALID_PDF_EXTRACTION_RESULT", exception.getErrorCode().code());
    }
}
