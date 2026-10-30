package art.yesulin.pdfextraction.application;

import static art.yesulin.pdfextraction.application.PdfExtractionFixtures.MAPPER;
import static art.yesulin.pdfextraction.application.PdfExtractionFixtures.NOW;
import static art.yesulin.pdfextraction.application.PdfExtractionFixtures.command;
import static art.yesulin.pdfextraction.application.PdfExtractionFixtures.manifest;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import art.yesulin.pdfextraction.application.ai.PdfAiCompletedEvent;
import art.yesulin.pdfextraction.application.ai.PdfAiFailedEvent;
import art.yesulin.pdfextraction.application.ai.PdfAiFailure;
import art.yesulin.pdfextraction.application.ai.PdfAiProperties;
import art.yesulin.pdfextraction.application.ai.PdfAiQueueService;
import art.yesulin.pdfextraction.application.ai.PdfAiWork;
import art.yesulin.pdfextraction.domain.PdfExtractionJob;
import art.yesulin.pdfextraction.domain.PdfExtractionJobRepository;
import art.yesulin.pdfextraction.domain.PdfExtractionPayload;
import art.yesulin.pdfextraction.domain.PdfExtractionPayloadRepository;
import art.yesulin.pdfextraction.domain.PdfExtractionStatus;
import art.yesulin.pdfextraction.domain.ai.PdfAiGateRepository;
import art.yesulin.pdfextraction.domain.ai.PdfAiJob;
import art.yesulin.pdfextraction.domain.ai.PdfAiJobRepository;
import art.yesulin.pdfextraction.domain.ai.PdfAiStatus;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import tools.jackson.databind.node.ObjectNode;

class PdfActorProfileFlowTest {

    private static final String TEXT = "성명: 가상배우";
    private final PdfExtractionJob job = PdfExtractionJob.forActorProfile(7, "synthetic.pdf", 100,
            NOW, NOW.plusSeconds(600));
    private final FakePdfExtractionStorage storage = new FakePdfExtractionStorage();
    private final PdfAiJobRepository aiJobs = mock(PdfAiJobRepository.class);
    private final Map<String, PdfAiJob> queued = new HashMap<>();
    private final Map<String, PdfExtractionPayload> stored = new HashMap<>();
    private final AtomicReference<Instant> now = new AtomicReference<>(NOW);
    private PdfAiQueueService queue;
    private PdfExtractionResultReceiver receiver;
    private PdfExtractionService extraction;

    @BeforeEach
    void setUp() {
        Clock clock = mock(Clock.class);
        when(clock.instant()).thenAnswer(call -> now.get());
        PdfExtractionJobRepository jobs = mock(PdfExtractionJobRepository.class);
        when(jobs.findForUpdate(job.getId())).thenReturn(Optional.of(job));
        PdfExtractionPayloadRepository payloads = mock(PdfExtractionPayloadRepository.class);
        when(payloads.findById(anyString())).thenAnswer(call -> Optional.ofNullable(stored.get(call.getArgument(0))));
        when(payloads.save(any())).thenAnswer(call -> {
            PdfExtractionPayload payload = call.getArgument(0);
            stored.put(payload.getJobId(), payload);
            return payload;
        });
        when(aiJobs.findById(anyString())).thenAnswer(call -> Optional.ofNullable(queued.get(call.getArgument(0))));
        when(aiJobs.findForUpdate(anyString()))
                .thenAnswer(call -> Optional.ofNullable(queued.get(call.getArgument(0))));
        when(aiJobs.save(any())).thenAnswer(call -> {
            PdfAiJob ai = call.getArgument(0);
            queued.put(ai.getJobId(), ai);
            return ai;
        });
        extraction = new PdfExtractionService(jobs, payloads, storage, MAPPER, clock, aiJobs, event -> {});
        PdfActorProfileCompletionService completion = new PdfActorProfileCompletionService(jobs, extraction, clock);
        ApplicationEventPublisher events = event -> {
            if (event instanceof PdfAiCompletedEvent completed) {
                completion.finish(completed.jobId());
            } else if (event instanceof PdfAiFailedEvent failed) {
                completion.finish(failed.jobId());
            }
        };
        PdfAiProperties properties = new PdfAiProperties(true, "gemini", "test-model", "unused", 1, 3,
                Duration.ofMinutes(2), Duration.ofSeconds(10));
        queue = new PdfAiQueueService(aiJobs, mock(PdfAiGateRepository.class), payloads, MAPPER,
                events, properties, clock);
        receiver = new PdfExtractionResultReceiver(jobs, payloads, new PdfExtractionResultParser(storage, MAPPER),
                storage, events, MAPPER, clock, queue);
    }

    @Test
    void actorExtractionQueuesAiOnceAndFinishesWithTheAiProfileWithoutMutatingRawPayload() {
        ObjectNode input = manifest(job, storage, "COMPLETED", TEXT);
        receiver.receive(command(job, storage, input));
        final String raw = stored.get(job.getId()).getPayloadJson();
        final PdfAiJob ai = queued.get(job.getId());
        assertEquals(PdfExtractionStatus.QUEUED, job.getStatus());
        assertNull(job.getFinishedAt());
        assertFalse(job.isDailyQuotaUsed());
        assertTrue(job.isInProgress(NOW));
        assertNull(ai.getReviewId());
        assertEquals("[]", ai.getRolesJson());

        receiver.receive(command(job, storage, input));
        assertEquals(1, queued.size());
        PdfAiWork work = acquire(ai);
        now.set(NOW.plusSeconds(10));
        assertTrue(queue.complete(work, proposal()));

        assertEquals(PdfExtractionStatus.COMPLETED, job.getStatus());
        assertEquals(now.get(), job.getFinishedAt());
        assertTrue(job.isDailyQuotaUsed());
        assertEquals("가상배우", extraction.storedResult(job).applicantInfo().applicantName());
        assertEquals(raw, stored.get(job.getId()).getPayloadJson());
        assertFalse(queue.complete(work, proposal()));
        receiver.receive(command(job, storage, input));
        assertEquals(NOW.plusSeconds(10), job.getFinishedAt());
    }

    @Test
    void retryableFailureKeepsActorWaitingAndFinalFailureFinishesWithoutChargingAnEmptyProfile() {
        receive();
        final PdfAiJob ai = queued.get(job.getId());
        PdfAiWork first = acquire(ai);
        queue.fail(first, new PdfAiFailure("PROVIDER_ERROR", true));
        assertEquals(PdfAiStatus.PENDING, ai.getStatus());
        assertEquals(PdfExtractionStatus.QUEUED, job.getStatus());
        assertNull(job.getFinishedAt());

        now.set(ai.getNextAttemptAt());
        PdfAiWork second = acquire(ai);
        queue.fail(second, new PdfAiFailure("INVALID_MODEL_OUTPUT", false));
        assertEquals(PdfAiStatus.FAILED, ai.getStatus());
        assertTrue(job.isFinished());
        assertEquals(now.get(), job.getFinishedAt());
        assertFalse(job.isDailyQuotaUsed());
        assertEquals(PdfApplicantInfo.FAILED, extraction.storedResult(job).applicantInfo().status());
    }

    @Test
    void emptyTextSkipsAiAndImmediatelyFinishesActorImport() {
        receiver.receive(command(job, storage, manifest(job, storage, "COMPLETED", "")));
        assertEquals(PdfAiStatus.SKIPPED, queued.get(job.getId()).getStatus());
        assertEquals("NO_TEXT", queued.get(job.getId()).getErrorCode());
        assertTrue(job.isFinished());
        assertEquals(NOW, job.getFinishedAt());
        assertFalse(job.isDailyQuotaUsed());
    }

    @Test
    void legacyCompletedProfileIsFinalizedWithoutCallingTheModelAgain() {
        ObjectNode input = manifest(job, storage, "COMPLETED", TEXT);
        input.set("applicantInfo", MAPPER.valueToTree(proposal()));

        receiver.receive(command(job, storage, input));

        assertEquals(PdfAiStatus.SKIPPED, queued.get(job.getId()).getStatus());
        assertEquals("LEGACY_COMPLETED", queued.get(job.getId()).getErrorCode());
        assertTrue(job.isFinished());
        assertTrue(job.isDailyQuotaUsed());
        assertEquals("가상배우", extraction.storedResult(job).applicantInfo().applicantName());
    }

    @Test
    void failedExtractionSkipsAiWithoutChargingTheActorQuota() {
        receiver.receive(command(job, storage, manifest(job, storage, "FAILED", "")));

        assertEquals(PdfAiStatus.SKIPPED, queued.get(job.getId()).getStatus());
        assertEquals("EXTRACTION_FAILED", queued.get(job.getId()).getErrorCode());
        assertEquals(PdfExtractionStatus.FAILED, job.getStatus());
        assertFalse(job.isDailyQuotaUsed());
        assertEquals(NOW, job.getFinishedAt());
    }

    @Test
    void expiredLeaseCannotFinishActorUntilCurrentWorkerCompletes() {
        receive();
        final PdfAiJob ai = queued.get(job.getId());
        PdfAiWork first = acquire(ai);
        now.set(NOW.plusSeconds(121));
        assertFalse(queue.complete(first, proposal()));
        assertFalse(job.isFinished());
        ai.recoverExpired(3, now.get());
        now.set(ai.getNextAttemptAt());
        PdfAiWork second = acquire(ai);
        assertFalse(queue.complete(first, proposal()));
        assertTrue(queue.complete(second, proposal()));
        assertTrue(job.isFinished());
    }

    @Test
    void deletedActorImportRejectsLateAiAndExtractionCannotRestorePersonalData() {
        receive();
        final PdfAiWork work = acquire(queued.get(job.getId()));
        queued.clear();
        stored.clear();
        job.markDeleted(NOW);

        assertFalse(queue.complete(work, proposal()));
        queue.fail(work, new PdfAiFailure("PROVIDER_ERROR", true));
        receiver.receive(command(job, storage, manifest(job, storage, "COMPLETED", TEXT)));

        assertTrue(queued.isEmpty());
        assertTrue(stored.isEmpty());
        assertEquals(List.of(job.getId()), storage.deletedJobs());
        assertNull(job.getFinishedAt());
    }

    private void receive() {
        receiver.receive(command(job, storage, manifest(job, storage, "COMPLETED", TEXT)));
    }

    private PdfAiWork acquire(PdfAiJob ai) {
        String token = ai.acquire(now.get(), Duration.ofMinutes(2), "gemini", "test-model", "v1");
        return new PdfAiWork(job.getId(), token, job.getOwnerId(), TEXT, List.of(), "gemini", "test-model");
    }

    private PdfApplicantInfo proposal() {
        return new PdfApplicantInfo(PdfApplicantInfo.PROFILE_VERSION, "COMPLETED", "gemini", "test-model",
                "가상배우", "성명: 가상배우", null, null, "");
    }
}
