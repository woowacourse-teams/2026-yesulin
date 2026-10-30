package art.yesulin.pdfextraction.application.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import art.yesulin.global.exception.BusinessException;
import art.yesulin.pdfextraction.domain.PdfExtractionJob;
import art.yesulin.pdfextraction.domain.PdfExtractionJobRepository;
import art.yesulin.pdfextraction.domain.PdfExtractionPayloadRepository;
import art.yesulin.pdfextraction.domain.PdfExtractionPurpose;
import art.yesulin.pdfextraction.domain.PdfExtractionStatus;
import art.yesulin.pdfextraction.domain.ai.PdfAiJob;
import art.yesulin.pdfextraction.domain.ai.PdfAiJobRepository;
import art.yesulin.pdfextraction.domain.ai.PdfAiStatus;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.context.ApplicationEventPublisher;

class PdfAiRetryServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-30T10:00:00Z");
    private final PdfAiJobRepository jobs = mock(PdfAiJobRepository.class);
    private final PdfExtractionJobRepository sources = mock(PdfExtractionJobRepository.class);
    private final PdfExtractionPayloadRepository payloads = mock(PdfExtractionPayloadRepository.class);
    private final PdfAiProperties properties = mock(PdfAiProperties.class);
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final PdfExtractionJob source = mock(PdfExtractionJob.class);
    private final PdfAiJob job = new PdfAiJob("job", "review", 1, "[]", NOW);
    private final PdfAiRetryService service = new PdfAiRetryService(jobs, sources, payloads, properties, events,
            Clock.fixed(NOW, ZoneOffset.UTC));
    private final PdfAiRetryRequest request = new PdfAiRetryRequest("job", 1, NOW.toEpochMilli(), 0);

    @BeforeEach
    void setUp() {
        String lease = job.acquire(NOW, Duration.ofMinutes(2), "bedrock", "model", "prompt");
        job.fail(lease, "INVALID_MODEL_OUTPUT", false, 3, NOW);
        when(properties.enabled()).thenReturn(true);
        when(jobs.findForUpdate("job")).thenReturn(Optional.of(job));
        when(sources.findById("job")).thenReturn(Optional.of(source));
        when(source.getPurpose()).thenReturn(PdfExtractionPurpose.PDF_REVIEW);
        when(source.isFinished()).thenReturn(true);
        when(source.getStatus()).thenReturn(PdfExtractionStatus.COMPLETED);
        when(source.getOwnerId()).thenReturn(1L);
        when(source.getReviewId()).thenReturn("review");
        when(payloads.existsById("job")).thenReturn(true);
    }

    @Test
    void duplicateClicksOnlyQueueOnceAndReopenProcessingAfterFailure() {
        assertEquals(PdfAiRetryService.Result.QUEUED, service.request(request, 1, false));
        assertEquals(PdfAiRetryService.Result.ALREADY_PROCESSING, service.request(request, 1, false));
        assertEquals(PdfAiStatus.PENDING, job.getStatus());
        assertEquals(0, job.getAttempts());
        verify(events, times(1)).publishEvent(new PdfAiRetriedEvent("job", 1));
        verify(events, times(1)).publishEvent(new PdfAiQueuedEvent("job"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"deleted", "actor", "failed", "unfinished", "owner", "review", "payload", "source"})
    void rejectsUnavailableOrUnrelatedSourceWithoutPublishing(String condition) {
        switch (condition) {
            case "deleted" -> when(source.isDeleted()).thenReturn(true);
            case "actor" -> when(source.getPurpose()).thenReturn(PdfExtractionPurpose.ACTOR_PROFILE);
            case "failed" -> when(source.getStatus()).thenReturn(PdfExtractionStatus.FAILED);
            case "unfinished" -> when(source.isFinished()).thenReturn(false);
            case "owner" -> when(source.getOwnerId()).thenReturn(2L);
            case "review" -> when(source.getReviewId()).thenReturn("different");
            case "payload" -> when(payloads.existsById("job")).thenReturn(false);
            case "source" -> when(sources.findById("job")).thenReturn(Optional.empty());
            default -> throw new IllegalArgumentException(condition);
        }
        assertEquals(PdfAiRetryService.Result.UNAVAILABLE, service.request(request, 1, false));
        assertEquals(PdfAiStatus.FAILED, job.getStatus());
        verify(events, never()).publishEvent(any());
    }

    @Test
    void disabledAnalysisAndStaleFailureDoNotQueue() {
        when(properties.enabled()).thenReturn(false);
        assertEquals(PdfAiRetryService.Result.DISABLED, service.request(request, 1, false));
        when(properties.enabled()).thenReturn(true);
        assertEquals(PdfAiRetryService.Result.UNAVAILABLE,
                service.request(new PdfAiRetryRequest("job", 1, NOW.toEpochMilli(), 1), 1, false));
        assertEquals(PdfAiStatus.FAILED, job.getStatus());
        verify(events, never()).publishEvent(any());
    }

    @Test
    void onlyOwnerOrAdministratorCanRetryEvenWhenAlreadyProcessing() {
        assertThrows(BusinessException.class, () -> service.request(request, 2, false));
        assertEquals(PdfAiStatus.FAILED, job.getStatus());
        assertEquals(PdfAiRetryService.Result.QUEUED, service.request(request, 2, true));
        assertThrows(BusinessException.class, () -> service.request(request, 2, false));
    }
}
