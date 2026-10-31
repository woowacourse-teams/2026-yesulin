package art.yesulin.audit.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import art.yesulin.audit.domain.AuditApplicant;
import art.yesulin.audit.domain.AuditApplicantRepository;
import art.yesulin.audit.domain.AuditDecision;
import art.yesulin.auth.domain.member.Member;
import art.yesulin.auth.domain.member.MemberRepository;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.infrastructure.persistence.QueryDslConfiguration;
import art.yesulin.pdfextraction.application.FakePdfExtractionStorage;
import art.yesulin.pdfextraction.application.PdfExtractionResult;
import art.yesulin.pdfextraction.application.PdfExtractionService;
import art.yesulin.pdfextraction.application.PdfExtractionService.PreparedUpload;
import art.yesulin.pdfextraction.domain.PdfExtractionJob;
import art.yesulin.pdfextraction.domain.PdfExtractionJobRepository;
import art.yesulin.pdfextraction.domain.PdfExtractionPayload;
import art.yesulin.pdfextraction.domain.PdfExtractionPayloadRepository;
import art.yesulin.pdfextraction.domain.PdfExtractionStatus;
import db.migration.PdfSourceHashesMigration;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicReference;
import org.flywaydb.core.api.migration.Context;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

@DataJpaTest(showSql = false, properties = {
        "spring.datasource.url=jdbc:h2:mem:pdf-source-dedup;MODE=MySQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000",
        "spring.jpa.hibernate.ddl-auto=validate", "yesulin.pdf-extraction.enabled=true"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({AuditService.class, PdfExtractionService.class,
        PdfSourceDeduplicationDatabaseTest.Config.class, QueryDslConfiguration.class})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class PdfSourceDeduplicationDatabaseTest {

    private static final Instant NOW = Instant.parse("2026-10-30T00:00:00Z");
    private static final String SHA = "a".repeat(64);
    @Autowired
    private AuditService service;
    @Autowired
    private MemberRepository members;
    @Autowired
    private PdfExtractionJobRepository jobs;
    @Autowired
    private PdfExtractionPayloadRepository payloads;
    @Autowired
    private AuditApplicantRepository entries;
    @Autowired
    private ObjectMapper mapper;
    @Autowired
    private JdbcTemplate jdbc;
    @Autowired
    private PlatformTransactionManager transactions;
    @Autowired
    private BlockingStorage storage;

    @Test
    void renamedSourceReusesUploadedJobWithoutChangingManualReview() {
        long ownerId = owner();
        String reviewId = review(ownerId);
        PreparedUpload first = service.prepareUpload(ownerId, reviewId, "original.pdf", 100, SHA);
        PdfExtractionJob job = jobs.findById(first.jobId()).orElseThrow();
        job.receiveResult("COMPLETED", NOW);
        jobs.saveAndFlush(job);
        String entryId = service.find(ownerId, reviewId).entries().getFirst().id();
        service.editEntry(ownerId, reviewId, entryId, "유지할 심사 메모", AuditDecision.HOLD);

        PreparedUpload duplicate = service.prepareUpload(ownerId, reviewId, "renamed.pdf", 100, SHA);

        assertTrue(duplicate.duplicate());
        assertEquals(first.jobId(), duplicate.jobId());
        assertNull(duplicate.upload());
        AuditDetail detail = service.find(ownerId, reviewId);
        assertEquals(1, detail.entries().size());
        assertEquals("유지할 심사 메모", detail.entries().getFirst().memo());
        assertEquals(AuditDecision.HOLD, detail.entries().getFirst().decision());
    }

    @Test
    void competingRequestsCreateOnlyOneJobAndApplicant() throws Exception {
        long ownerId = owner();
        String reviewId = review(ownerId);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        try (java.util.concurrent.ExecutorService pool = Executors.newFixedThreadPool(2)) {
            Future<PreparedUpload> first = pool.submit(() -> upload(ownerId, reviewId, ready, start));
            Future<PreparedUpload> second = pool.submit(() -> upload(ownerId, reviewId, ready, start));
            assertTrue(ready.await(5, TimeUnit.SECONDS));
            start.countDown();
            PreparedUpload left = first.get(10, TimeUnit.SECONDS);
            PreparedUpload right = second.get(10, TimeUnit.SECONDS);

            assertEquals(left.jobId(), right.jobId());
            assertNotEquals(left.duplicate(), right.duplicate());
            assertEquals(1, service.find(ownerId, reviewId).entries().size());
            assertEquals(1, jdbc.queryForObject("select count(*) from pdf_extraction_jobs where review_id = ?",
                    Integer.class, reviewId));
        }
    }

    @Test
    void pendingExpiredUploadRenewsTheSameJobAndKeepsItsChecksum() {
        long ownerId = owner();
        String reviewId = review(ownerId);
        PreparedUpload first = service.prepareUpload(ownerId, reviewId, "original.pdf", 100, SHA);
        jdbc.update("update pdf_extraction_jobs set upload_expires_at = ? where id = ?",
                java.sql.Timestamp.from(NOW.minusSeconds(60)), first.jobId());

        PreparedUpload retry = service.prepareUpload(ownerId, reviewId, "renamed.pdf", 100, SHA);

        assertTrue(retry.duplicate());
        assertEquals(first.jobId(), retry.jobId());
        assertTrue(retry.upload() != null);
        PdfExtractionJob stored = jobs.findById(first.jobId()).orElseThrow();
        assertEquals(SHA, stored.getSourceSha256());
        assertEquals(NOW.plusSeconds(600), stored.getUploadExpiresAt());
        assertEquals(1, service.find(ownerId, reviewId).entries().size());
    }

    @Test
    void renewalHoldsJobLockSoCompletionCannotBeOverwritten() throws Exception {
        long ownerId = owner();
        String reviewId = review(ownerId);
        final String jobId = service.prepareUpload(ownerId, reviewId, "original.pdf", 100, SHA).jobId();
        final Gate gate = storage.blockNextPrepare();
        try (java.util.concurrent.ExecutorService pool = Executors.newFixedThreadPool(2)) {
            Future<PreparedUpload> renewal = pool.submit(() ->
                    service.prepareUpload(ownerId, reviewId, "renamed.pdf", 100, SHA));
            try {
                assertTrue(gate.entered().await(5, TimeUnit.SECONDS));
                Future<Void> completion = pool.submit(() -> {
                    new TransactionTemplate(transactions).executeWithoutResult(transaction ->
                            jobs.findForUpdate(jobId).orElseThrow().confirmUpload(NOW.plusSeconds(1)));
                    return null;
                });
                try {
                    assertThrows(TimeoutException.class, () -> completion.get(200, TimeUnit.MILLISECONDS));
                } finally {
                    gate.release().countDown();
                }
                completion.get(5, TimeUnit.SECONDS);
            } finally {
                gate.release().countDown();
            }
            renewal.get(5, TimeUnit.SECONDS);
        }
        PdfExtractionJob stored = jobs.findById(jobId).orElseThrow();
        assertEquals(PdfExtractionStatus.QUEUED, stored.getStatus());
        assertEquals(NOW.plusSeconds(1), stored.getUploadedAt());
    }

    @Test
    void differentBytesOrAnotherReviewRemainSeparateAndOtherOwnerCannotProbe() {
        long ownerId = owner();
        String reviewId = review(ownerId);
        PreparedUpload first = service.prepareUpload(ownerId, reviewId, "same.pdf", 100, SHA);
        PreparedUpload changed = service.prepareUpload(ownerId, reviewId, "same.pdf", 100, "b".repeat(64));
        PreparedUpload otherReview = service.prepareUpload(ownerId, review(ownerId), "same.pdf", 100, SHA);

        assertFalse(changed.duplicate());
        assertFalse(otherReview.duplicate());
        assertNotEquals(first.jobId(), changed.jobId());
        assertNotEquals(first.jobId(), otherReview.jobId());
        assertThrows(BusinessException.class, () -> service.prepareUpload(owner(), reviewId, "same.pdf", 100, SHA));
        assertThrows(BusinessException.class, () -> service.prepareUpload(ownerId, reviewId, "same.pdf", 100, "bad"));
        assertEquals(2, service.find(ownerId, reviewId).entries().size());
    }

    @Test
    void backfillFindsExistingContentAndPreservesBothHistoricalApplicants() {
        long ownerId = owner();
        String reviewId = review(ownerId);
        legacy(ownerId, reviewId, "old-one.pdf");
        legacy(ownerId, reviewId, "old-two.pdf");
        jdbc.execute((ConnectionCallback<Void>) connection -> {
            Context context = mock(Context.class);
            when(context.getConnection()).thenReturn(connection);
            try {
                new PdfSourceHashesMigration().migrate(context);
            } catch (Exception exception) {
                throw new IllegalStateException(exception);
            }
            return null;
        });

        PreparedUpload duplicate = service.prepareUpload(ownerId, reviewId, "renamed.pdf", 100, SHA);

        assertTrue(duplicate.duplicate());
        assertNull(duplicate.upload());
        assertEquals(2, service.find(ownerId, reviewId).entries().size());
        assertEquals(1, jdbc.queryForObject("select count(*) from pdf_extraction_jobs "
                + "where review_id = ? and source_sha256 = ?", Integer.class, reviewId, SHA));
    }

    private void legacy(long ownerId, String reviewId, String filename) {
        PdfExtractionJob job = new PdfExtractionJob(ownerId, filename, 100, NOW, NOW.plusSeconds(600), reviewId);
        job.receiveResult("COMPLETED", NOW);
        jobs.saveAndFlush(job);
        entries.saveAndFlush(new AuditApplicant(reviewId, job.getId(), filename));
        PdfExtractionResult result = new PdfExtractionResult("COMPLETED", SHA, "", List.of(), List.of());
        payloads.saveAndFlush(new PdfExtractionPayload(job.getId(), mapper.writeValueAsString(result),
                "f".repeat(64), NOW));
    }

    private PreparedUpload upload(long ownerId, String reviewId, CountDownLatch ready, CountDownLatch start)
            throws InterruptedException {
        ready.countDown();
        if (!start.await(5, TimeUnit.SECONDS)) {
            throw new IllegalStateException("Upload race did not start");
        }
        return service.prepareUpload(ownerId, reviewId, "same.pdf", 100, SHA);
    }

    private long owner() {
        return members.save(new Member(UUID.randomUUID() + "@example.test", "password",
                MemberType.PRODUCER, MemberStatus.ACTIVE)).getId();
    }

    private String review(long ownerId) {
        return service.create(ownerId, "중복 검증", List.of()).id();
    }

    @TestConfiguration
    static class Config {
        @Bean
        Clock clock() {
            return Clock.fixed(NOW, ZoneOffset.UTC);
        }

        @Bean
        ObjectMapper mapper() {
            return JsonMapper.builder().build();
        }

        @Bean
        BlockingStorage storage() {
            return new BlockingStorage();
        }
    }

    private record Gate(CountDownLatch entered, CountDownLatch release) {
    }

    static class BlockingStorage extends FakePdfExtractionStorage {
        private final AtomicReference<Gate> next = new AtomicReference<>();

        Gate blockNextPrepare() {
            Gate gate = new Gate(new CountDownLatch(1), new CountDownLatch(1));
            next.set(gate);
            return gate;
        }

        @Override
        public UploadTarget prepare(PdfExtractionJob job) {
            Gate gate = next.getAndSet(null);
            if (gate != null) {
                gate.entered().countDown();
                try {
                    if (!gate.release().await(5, TimeUnit.SECONDS)) {
                        throw new IllegalStateException("Renewal test did not release upload preparation");
                    }
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    throw new IllegalStateException(exception);
                }
            }
            return super.prepare(job);
        }
    }
}
