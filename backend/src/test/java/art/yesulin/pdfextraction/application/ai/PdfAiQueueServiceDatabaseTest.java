package art.yesulin.pdfextraction.application.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import art.yesulin.audit.domain.Audit;
import art.yesulin.audit.domain.AuditRepository;
import art.yesulin.auth.domain.member.Member;
import art.yesulin.auth.domain.member.MemberRepository;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.infrastructure.persistence.QueryDslConfiguration;
import art.yesulin.pdfextraction.application.PdfApplicantInfo;
import art.yesulin.pdfextraction.application.PdfExtractionCompletedEvent;
import art.yesulin.pdfextraction.application.PdfExtractionResult;
import art.yesulin.pdfextraction.domain.PdfExtractionJob;
import art.yesulin.pdfextraction.domain.PdfExtractionJobRepository;
import art.yesulin.pdfextraction.domain.PdfExtractionPayload;
import art.yesulin.pdfextraction.domain.PdfExtractionPayloadRepository;
import art.yesulin.pdfextraction.domain.ai.PdfAiJob;
import art.yesulin.pdfextraction.domain.ai.PdfAiJobRepository;
import art.yesulin.pdfextraction.domain.ai.PdfAiStatus;
import art.yesulin.pdfextraction.presentation.event.PdfAiQueuedEventHandler;
import art.yesulin.pdfextraction.presentation.event.PdfFlowEventHandler;
import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

@DataJpaTest(showSql = false, properties = {
        "spring.datasource.url=jdbc:h2:mem:pdf-ai-queue;MODE=MySQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000",
        "spring.jpa.hibernate.ddl-auto=validate",
        "yesulin.pdf-extraction.enabled=true",
        "yesulin.pdf-ai.enabled=true"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({PdfAiQueueService.class, PdfAiQueuedEventHandler.class, PdfFlowEventHandler.class,
        PdfAiQueueServiceDatabaseTest.Config.class, QueryDslConfiguration.class})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class PdfAiQueueServiceDatabaseTest {

    private static final Instant NOW = Instant.parse("2026-10-26T00:00:00Z");
    @Autowired
    private PdfAiQueueService queue;
    @Autowired
    private PdfAiJobRepository aiJobs;
    @Autowired
    private PdfExtractionJobRepository jobs;
    @Autowired
    private PdfExtractionPayloadRepository payloads;
    @Autowired
    private AuditRepository reviews;
    @Autowired
    private MemberRepository members;
    @Autowired
    private ObjectMapper mapper;
    @Autowired
    private MutableClock clock;
    @Autowired
    private JdbcTemplate jdbc;
    @Autowired
    private FailureRecorder failures;
    @Autowired
    private PlatformTransactionManager transactions;
    @MockitoBean
    private PdfAiDispatcher dispatcher;
    @MockitoSpyBean
    private PdfAiProperties properties;
    @Autowired
    private ApplicationEventPublisher events;

    @BeforeEach
    void resetGateAndClock() {
        aiJobs.deleteAllInBatch();
        clock.set(NOW);
        jdbc.update("update pdf_ai_worker_gate set next_request_at = ?", Timestamp.from(NOW));
        reset(dispatcher);
    }

    @Test
    void newPendingWorkSignalsOnlyAfterOuterCallbackTransactionCommits() {
        new TransactionTemplate(transactions).executeWithoutResult(transaction -> {
            enqueue();
            verifyNoInteractions(dispatcher);
        });

        verify(dispatcher).wakeUp();
        assertEquals(1, aiJobs.count());
    }

    @Test
    void rolledBackCallbackNeverSignalsOrLeavesAiWork() {
        new TransactionTemplate(transactions).executeWithoutResult(transaction -> {
            enqueue();
            transaction.setRollbackOnly();
        });

        verifyNoInteractions(dispatcher);
        assertEquals(0, aiJobs.count());
    }

    @Test
    void duplicateAndSkippedEnqueuesDoNotSignalAnotherModelRun() {
        String jobId = enqueue();
        reset(dispatcher);
        PdfExtractionJob job = jobs.findById(jobId).orElseThrow();

        queue.enqueue(jobId, job.getReviewId(), job.getOwnerId(), "이름: 가상배우", List.of(), null);
        enqueue("FAILED", null);

        verifyNoInteractions(dispatcher);
        assertEquals(2, aiJobs.count());
    }

    @Test
    void increasedCapacityAllowsParallelClaimsWithoutExceedingGlobalLimit() throws Exception {
        doReturn(2).when(properties).concurrency();
        doReturn(Duration.ZERO).when(properties).requestInterval();
        enqueue();
        enqueue();
        enqueue();
        CountDownLatch ready = new CountDownLatch(3);
        CountDownLatch start = new CountDownLatch(1);
        try (java.util.concurrent.ExecutorService pool = Executors.newFixedThreadPool(3)) {
            Future<Optional<PdfAiWork>> first = pool.submit(() -> claim(ready, start));
            Future<Optional<PdfAiWork>> second = pool.submit(() -> claim(ready, start));
            Future<Optional<PdfAiWork>> third = pool.submit(() -> claim(ready, start));
            assertTrue(ready.await(5, TimeUnit.SECONDS));
            start.countDown();
            List<Optional<PdfAiWork>> claims = List.of(first.get(10, TimeUnit.SECONDS),
                    second.get(10, TimeUnit.SECONDS), third.get(10, TimeUnit.SECONDS));

            assertEquals(2, claims.stream().filter(Optional::isPresent).count());
            assertEquals(2, aiJobs.countByStatusAndLeaseExpiresAtAfter(PdfAiStatus.RUNNING, NOW));
            assertTrue(queue.claim().isEmpty());
        }
    }

    @Test
    void claimedWorkSchedulesNextAdmissionOnlyAfterClaimCommit() {
        enqueue();
        reset(dispatcher);

        new TransactionTemplate(transactions).executeWithoutResult(transaction -> {
            assertTrue(queue.claim().isPresent());
            verifyNoInteractions(dispatcher);
        });

        verify(dispatcher).wakeUpAfterInterval();
    }

    @Test
    void rolledBackClaimDoesNotScheduleNextAdmissionOrConsumeAttempt() {
        final String jobId = enqueue();
        reset(dispatcher);

        new TransactionTemplate(transactions).executeWithoutResult(transaction -> {
            assertTrue(queue.claim().isPresent());
            transaction.setRollbackOnly();
        });

        verifyNoInteractions(dispatcher);
        PdfAiJob stored = aiJobs.findById(jobId).orElseThrow();
        assertEquals(PdfAiStatus.PENDING, stored.getStatus());
        assertEquals(0, stored.getAttempts());
    }

    @Test
    void flowLogsExtractionThenAiReadinessOnlyAfterCommitWithoutPayload() {
        Logger logger = (Logger) LoggerFactory.getLogger(PdfFlowEventHandler.class);
        final Level originalLevel = logger.getLevel();
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        logger.setLevel(Level.DEBUG);
        try {
            String jobId = new TransactionTemplate(transactions).execute(transaction -> {
                String id = enqueue();
                events.publishEvent(new PdfExtractionCompletedEvent(id, 1, "SECRET_SOURCE"));
                assertTrue(appender.list.isEmpty());
                return id;
            });
            List<String> messages = appender.list.stream().map(ILoggingEvent::getFormattedMessage).toList();
            assertEquals(List.of("PDF_FLOW stage=EXTRACTION_COMMITTED jobId=" + jobId,
                    "PDF_FLOW stage=AI_READY jobId=" + jobId), messages);
            assertFalse(String.join("\n", messages).contains("SECRET_SOURCE"));
        } finally {
            logger.detachAppender(appender);
            logger.setLevel(originalLevel);
            appender.stop();
        }
    }

    @Test
    void rolledBackWorkProducesNoCommittedFlowLog() {
        Logger logger = (Logger) LoggerFactory.getLogger(PdfFlowEventHandler.class);
        final Level originalLevel = logger.getLevel();
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        logger.setLevel(Level.DEBUG);
        try {
            new TransactionTemplate(transactions).executeWithoutResult(transaction -> {
                String jobId = enqueue();
                events.publishEvent(new PdfExtractionCompletedEvent(jobId, 1, "SECRET_SOURCE"));
                transaction.setRollbackOnly();
            });
            assertTrue(appender.list.isEmpty());
        } finally {
            logger.detachAppender(appender);
            logger.setLevel(originalLevel);
            appender.stop();
        }
    }

    @Test
    void competingWorkersShareOneGlobalSlotAndCompletionDoesNotMutateExtraction() throws Exception {
        String firstJob = enqueue();
        enqueue();
        PdfExtractionPayload original = payloads.findById(firstJob).orElseThrow();
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        try (java.util.concurrent.ExecutorService pool = Executors.newFixedThreadPool(2)) {
            Future<Optional<PdfAiWork>> first = pool.submit(() -> claim(ready, start));
            Future<Optional<PdfAiWork>> second = pool.submit(() -> claim(ready, start));
            assertTrue(ready.await(5, TimeUnit.SECONDS));
            start.countDown();
            List<Optional<PdfAiWork>> results = List.of(first.get(10, TimeUnit.SECONDS),
                    second.get(10, TimeUnit.SECONDS));
            assertEquals(1L, results.stream().filter(Optional::isPresent).count());
            PdfAiWork work = results.stream().flatMap(Optional::stream).findFirst().orElseThrow();
            clock.set(NOW.plusSeconds(10));
            assertTrue(queue.claim().isEmpty());
            PdfApplicantInfo info = new PdfApplicantInfo("applicant-info-v2", "COMPLETED", "bedrock", "test-model",
                    "가상배우", "이름: 가상배우", null, null, "");
            assertTrue(queue.complete(work, info));
            assertFalse(queue.complete(work, info));
            assertEquals(PdfAiStatus.COMPLETED, aiJobs.findById(work.jobId()).orElseThrow().getStatus());
            assertEquals(original.getPayloadJson(), payloads.findById(firstJob).orElseThrow().getPayloadJson());
            assertEquals(original.getPayloadSha256(), payloads.findById(firstJob).orElseThrow().getPayloadSha256());
            assertTrue(queue.claim().isPresent());
        }
        aiJobs.deleteAllInBatch();
    }

    @Test
    void terminalJobDoesNotReleaseTheRateLimitBeforeTenSeconds() {
        enqueue();
        enqueue();
        PdfAiWork work = queue.claim().orElseThrow();
        queue.fail(work, new PdfAiFailure("INVALID_MODEL_OUTPUT", false));
        assertTrue(queue.claim().isEmpty());
        clock.set(NOW.plusSeconds(9));
        assertTrue(queue.claim().isEmpty());
        clock.set(NOW.plusSeconds(10));
        assertTrue(queue.claim().isPresent());
    }

    @Test
    void missingSourceFailsOnlyThatJobWithoutBlockingTheFollowingJob() {
        String broken = enqueue();
        payloads.deleteById(broken);
        clock.set(NOW.plusSeconds(1));
        enqueue();
        assertTrue(queue.claim().isEmpty());
        assertEquals(PdfAiStatus.FAILED, aiJobs.findById(broken).orElseThrow().getStatus());
        assertEquals("INVALID_SOURCE", aiJobs.findById(broken).orElseThrow().getErrorCode());
        assertTrue(queue.claim().isPresent());
    }

    @Test
    void permanentFailureAndLeaseRecoveryExhaustionPublishFailureEventsButRetriesDoNot() {
        failures.events.clear();
        final String permanent = enqueue();
        PdfAiWork work = queue.claim().orElseThrow();
        queue.fail(work, new PdfAiFailure("PROVIDER_ERROR", true));
        assertTrue(failures.events.isEmpty());
        clock.set(NOW.plusSeconds(60));
        jdbc.update("update pdf_ai_worker_gate set next_request_at = ?", Timestamp.from(NOW));
        PdfAiWork second = queue.claim().orElseThrow();
        queue.fail(second, new PdfAiFailure("INVALID_MODEL_OUTPUT", false));
        assertEquals(List.of(new PdfAiFailedEvent(permanent, second.ownerId())), failures.events);

        failures.events.clear();
        final String expired = enqueue();
        clock.set(NOW.plusSeconds(120));
        jdbc.update("update pdf_ai_worker_gate set next_request_at = ?", Timestamp.from(NOW));
        queue.claim().orElseThrow();
        for (int round = 1; round <= 6; round++) {
            clock.set(NOW.plusSeconds(120L + round * 1000L));
            jdbc.update("update pdf_ai_worker_gate set next_request_at = ?", Timestamp.from(NOW));
            queue.claim();
        }
        assertEquals(PdfAiStatus.FAILED, aiJobs.findById(expired).orElseThrow().getStatus());
        assertEquals(1, failures.events.stream().filter(event -> event.jobId().equals(expired)).count());
    }

    @Test
    void enqueueReturnsTheStoredJobSoCallbackReplayKeepsTheSameState() {
        String jobId = enqueue();
        PdfExtractionJob job = jobs.findById(jobId).orElseThrow();

        PdfAiJob replay = queue.enqueue(jobId, job.getReviewId(), job.getOwnerId(), "이름: 가상배우", List.of(), null);

        assertEquals(PdfAiStatus.PENDING, replay.getStatus());
        assertEquals(1, aiJobs.count());
    }

    @Test
    void failedPdfWithTextDoesNotEnqueueModelWork() {
        String failed = enqueue("FAILED", null);
        assertEquals(PdfAiStatus.SKIPPED, aiJobs.findById(failed).orElseThrow().getStatus());
        assertEquals("EXTRACTION_FAILED", aiJobs.findById(failed).orElseThrow().getErrorCode());
        assertTrue(queue.claim().isEmpty());
    }

    @Test
    void legacyCompletedCallbackDoesNotChargeForAnotherModelCall() {
        PdfApplicantInfo info = new PdfApplicantInfo("applicant-info-v2", "COMPLETED", "gemini", "legacy-model",
                "가상배우", "가상배우", null, null, "");
        String job = enqueue("COMPLETED", info);
        assertEquals(PdfAiStatus.SKIPPED, aiJobs.findById(job).orElseThrow().getStatus());
        assertEquals("LEGACY_COMPLETED", aiJobs.findById(job).orElseThrow().getErrorCode());
        assertTrue(queue.claim().isEmpty());
    }

    @Test
    void retryStatePersistsAndDuplicateCallbacksCannotCreateAnotherAiJob() {
        String jobId = enqueue();
        PdfAiWork work = queue.claim().orElseThrow();
        queue.fail(work, new PdfAiFailure("PROVIDER_ERROR", true));
        assertEquals(PdfAiStatus.PENDING, aiJobs.findById(jobId).orElseThrow().getStatus());
        assertEquals(1, aiJobs.findById(jobId).orElseThrow().getAttempts());
        assertTrue(queue.claim().isEmpty());
        PdfExtractionJob job = jobs.findById(jobId).orElseThrow();
        queue.enqueue(jobId, job.getReviewId(), job.getOwnerId(), "이름: 가상배우", List.of(), null);
        assertEquals(1, aiJobs.count());
        aiJobs.deleteAllInBatch();
    }

    private Optional<PdfAiWork> claim(CountDownLatch ready, CountDownLatch start) throws InterruptedException {
        ready.countDown();
        if (!start.await(5, TimeUnit.SECONDS)) {
            throw new IllegalStateException("Concurrent claim test did not start");
        }
        return queue.claim();
    }

    private String enqueue() {
        return enqueue("COMPLETED", null);
    }

    private String enqueue(String status, PdfApplicantInfo legacyInfo) {
        long ownerId = members.save(new Member(UUID.randomUUID() + "@example.test", "password",
                MemberType.PRODUCER, MemberStatus.ACTIVE)).getId();
        Audit review = reviews.save(new Audit(ownerId, "가상 심사", List.of("가상역"), NOW));
        PdfExtractionJob job = jobs.save(new PdfExtractionJob(ownerId, "가상.pdf", 100, NOW,
                NOW.plusSeconds(600), review.getId()));
        PdfExtractionResult result = new PdfExtractionResult(status, "sha", null, List.of(),
                List.of(new PdfExtractionResult.Page(1, "이름: 가상배우", false, List.of())));
        payloads.save(new PdfExtractionPayload(job.getId(), mapper.writeValueAsString(result), "immutable-sha", NOW));
        queue.enqueue(job.getId(), review.getId(), ownerId, result.extractedText(), List.of(), legacyInfo);
        return job.getId();
    }

    @TestConfiguration
    static class Config {

        @Bean
        MutableClock clock() {
            return new MutableClock();
        }

        @Bean
        FailureRecorder failureRecorder() {
            return new FailureRecorder();
        }

        @Bean
        ObjectMapper mapper() {
            return JsonMapper.builder().build();
        }

        @Bean
        PdfAiProperties properties() {
            return new PdfAiProperties(true, "bedrock", "test-model", "ap-northeast-2", 1, 3,
                    Duration.ofMinutes(2), Duration.ofSeconds(10));
        }
    }

    static class FailureRecorder {
        private final List<PdfAiFailedEvent> events = new CopyOnWriteArrayList<>();

        @EventListener
        void record(PdfAiFailedEvent event) {
            events.add(event);
        }
    }

    static class MutableClock extends Clock {
        private final AtomicReference<Instant> now = new AtomicReference<>(NOW);

        void set(Instant instant) {
            now.set(instant);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now.get();
        }
    }
}
