package art.yesulin.pdfextraction.application;

import static art.yesulin.pdfextraction.application.PdfExtractionFixtures.MAPPER;
import static art.yesulin.pdfextraction.application.PdfExtractionFixtures.NOW;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import art.yesulin.global.exception.BusinessException;
import art.yesulin.pdfextraction.domain.DocumentPreviewStatus;
import art.yesulin.pdfextraction.domain.PdfExtractionJob;
import art.yesulin.pdfextraction.domain.PdfExtractionJobRepository;
import java.time.Clock;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.node.ObjectNode;

class DocumentPreviewReceiverTest {

    private static final String ORIGINAL = "1".repeat(64);
    private static final String PREVIEW = "2".repeat(64);
    private final FakePdfExtractionStorage storage = new FakePdfExtractionStorage();
    private final List<Object> events = new ArrayList<>();
    private final PdfExtractionJob job = new PdfExtractionJob(1L, "배우.docx", 100, NOW, NOW.plusSeconds(600),
            UUID.randomUUID().toString());
    private final PdfExtractionJobRepository jobs = mock(PdfExtractionJobRepository.class);
    private final DocumentPreviewReceiver receiver = new DocumentPreviewReceiver(jobs, storage, events::add,
            Clock.fixed(NOW, ZoneOffset.UTC));

    DocumentPreviewReceiverTest() {
        job.identifySourceSha256(ORIGINAL);
        when(jobs.findForUpdate(job.getId())).thenReturn(Optional.of(job));
    }

    @Test
    void previewIsReadableBeforeExtractionAndCallbackReplayCannotReplaceIt() {
        job.confirmUpload(NOW);
        assertNull(view().sourceUrl());
        assertEquals("docx", view().extension());
        assertNotNull(view().originalUrl());
        receiver.receive(completion(DocumentPreviewStatus.READY, PREVIEW));
        receiver.receive(completion(DocumentPreviewStatus.READY, PREVIEW));
        assertEquals(DocumentPreviewStatus.READY, view().previewStatus());
        assertNotNull(view().sourceUrl());
        assertEquals(ORIGINAL, job.getSourceSha256());
        assertEquals(0, events.size());
        assertThrows(BusinessException.class, () ->
                receiver.receive(completion(DocumentPreviewStatus.READY, ORIGINAL)));
        assertThrows(BusinessException.class, () -> receiver.receive(completion(DocumentPreviewStatus.FAILED, null)));
    }

    @Test
    void failedCallbackBeforeBrowserConfirmationKeepsOriginalAndTerminatesProgress() {
        receiver.receive(completion(DocumentPreviewStatus.FAILED, null));
        receiver.receive(completion(DocumentPreviewStatus.FAILED, null));
        job.confirmUpload(NOW);
        assertEquals(DocumentPreviewStatus.FAILED, view().previewStatus());
        assertEquals("FAILED", view().status());
        assertNotNull(view().originalUrl());
        assertNull(view().sourceUrl());
        assertEquals(List.of(new DocumentPreviewFailedEvent(job.getId())), events);
    }

    @Test
    void extractionRequiresPublishedPreviewKeyAndItsOwnChecksum() {
        String key = storage.extractionInputFileKey(job);
        ObjectNode manifest = MAPPER.createObjectNode().put("jobId", job.getId()).put("status", "COMPLETED")
                .put("pipelineVersion", PdfExtractionResultParser.PIPELINE_VERSION);
        final ObjectNode source = manifest.putObject("source").put("key", key).put("sha256", PREVIEW);
        manifest.putArray("pages");
        PdfExtractionResultParser parser = new PdfExtractionResultParser(storage, MAPPER);
        var command = new ReceivePdfExtractionResultCommand(job.getId(), key,
                PdfExtractionResultParser.PIPELINE_VERSION, manifest);
        assertThrows(BusinessException.class, () -> parser.parse(job, command));
        receiver.receive(completion(DocumentPreviewStatus.READY, PREVIEW));
        assertEquals(List.of(new PdfExtractionUploadedEvent(job.getId())), events);
        assertEquals(PREVIEW, parser.parse(job, command).sourceSha256());
        source.put("sha256", ORIGINAL);
        assertThrows(BusinessException.class, () -> parser.parse(job, command));
        source.put("sha256", PREVIEW).put("key", storage.sourceFileKey(job));
        assertThrows(BusinessException.class, () -> parser.parse(job, command));
    }

    @Test
    void inconsistentSourceAndInvalidStageLeavePreviewPending() {
        assertThrows(BusinessException.class, () -> receiver.receive(new DocumentPreviewCompletion(job.getId(),
                "other-key", ORIGINAL, DocumentPreviewStatus.READY, PREVIEW)));
        assertThrows(BusinessException.class, () -> receiver.receive(new DocumentPreviewCompletion(job.getId(),
                storage.sourceFileKey(job), PREVIEW, DocumentPreviewStatus.FAILED, null)));
        storage.rejectUpload();
        assertThrows(IllegalArgumentException.class, () -> receiver.receive(completion(DocumentPreviewStatus.READY,
                PREVIEW)));
        assertEquals(DocumentPreviewStatus.PENDING, view().previewStatus());
        assertNull(job.getUploadedAt());
    }

    private PdfExtractionView view() {
        return PdfExtractionView.of(job, job.getStatus().name(), storage, null);
    }

    private DocumentPreviewCompletion completion(DocumentPreviewStatus status, String previewSha256) {
        return new DocumentPreviewCompletion(job.getId(), storage.sourceFileKey(job), ORIGINAL, status, previewSha256);
    }
}
