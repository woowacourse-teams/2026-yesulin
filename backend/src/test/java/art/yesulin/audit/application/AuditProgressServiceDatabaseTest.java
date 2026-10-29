package art.yesulin.audit.application;

import static art.yesulin.audit.domain.AuditErrorCode.PDF_REVIEW_NOT_FOUND;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.audit.domain.Audit;
import art.yesulin.audit.domain.AuditRepository;
import art.yesulin.audit.infrastructure.QuerydslAuditProgressQuery;
import art.yesulin.auth.domain.member.Member;
import art.yesulin.auth.domain.member.MemberRepository;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.infrastructure.persistence.QueryDslConfiguration;
import art.yesulin.pdfextraction.domain.PdfExtractionJob;
import art.yesulin.pdfextraction.domain.PdfExtractionJobRepository;
import art.yesulin.pdfextraction.domain.ai.PdfAiJob;
import art.yesulin.pdfextraction.domain.ai.PdfAiJobRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;

@DataJpaTest(showSql = false, properties = {
        "spring.datasource.url=jdbc:h2:mem:pdf-review-progress;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.jpa.hibernate.ddl-auto=validate",
        "yesulin.pdf-extraction.enabled=true"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({AuditProgressService.class, QuerydslAuditProgressQuery.class,
        QueryDslConfiguration.class, AuditProgressServiceDatabaseTest.TestConfig.class})
class AuditProgressServiceDatabaseTest {

    private static final Instant NOW = Instant.parse("2026-10-25T00:00:00Z");

    @Autowired
    private AuditProgressService service;

    @Autowired
    private AuditRepository reviews;

    @Autowired
    private PdfExtractionJobRepository jobs;
    @Autowired
    private PdfAiJobRepository aiJobs;

    @Autowired
    private MemberRepository members;

    private long owner;
    private Audit review;

    @BeforeEach
    void setUp() {
        owner = members.save(new Member(UUID.randomUUID() + "@example.test", "password",
                MemberType.PRODUCER, MemberStatus.ACTIVE)).getId();
        review = reviews.save(new Audit(owner, "가상 심사", List.of("앙상블"), NOW));
    }

    @Test
    void emptyReviewIsCompleteWithZeroCounts() {
        assertEquals(new AuditProgress(0, 0, 0, 0, 0, 0), service.find(owner, review.getId()));
        assertEquals(new AuditProgress.PdfStages(0, 0, 0, 0, 0), service.find(owner, review.getId()).pdf());
    }

    @Test
    void countsOnlyThisReviewWithoutLoadingResultsAndStopsAfterAllJobsFinish() {
        final PdfExtractionJob uploading = job(review.getId(), NOW.plusSeconds(600));
        PdfExtractionJob waiting = job(review.getId(), NOW.plusSeconds(600));
        waiting.confirmUpload(NOW.minusSeconds(3600));
        job(review.getId(), NOW.plusSeconds(600)).receiveResult("COMPLETED", NOW);
        job(review.getId(), NOW.plusSeconds(600)).receiveResult("PARTIAL", NOW);
        job(review.getId(), NOW.plusSeconds(600)).receiveResult("FAILED", NOW);
        job(review.getId(), NOW.minusSeconds(61));
        Audit other = reviews.save(new Audit(owner, "다른 심사", List.of("주연"), NOW));
        job(other.getId(), NOW.plusSeconds(600));
        job(null, NOW.plusSeconds(600));

        AuditProgress progress = service.find(owner, review.getId());

        assertEquals(new AuditProgress(6, 1, 1, 1, 1, 2), withoutStages(progress));
        assertEquals(new AuditProgress.PdfStages(1, 1, 1, 1, 2), progress.pdf());
        assertEquals(new AuditProgress.AiStages(6, 0, 0, 0, 0, 0), progress.ai());
        assertFalse(progress.complete());
        uploading.receiveResult("COMPLETED", NOW);
        waiting.receiveResult("COMPLETED", NOW);
        AuditProgress finished = service.find(owner, review.getId());
        assertEquals(new AuditProgress(6, 0, 0, 3, 1, 2), withoutStages(finished));
        assertTrue(finished.complete());
    }

    @Test
    void uploadGraceBoundaryRemainsUploadingAndExpiredUploadCountsAsFinishedFailure() {
        job(review.getId(), NOW.minusSeconds(60));
        assertEquals(new AuditProgress(1, 1, 0, 0, 0, 0), withoutStages(service.find(owner, review.getId())));
        Audit expired = reviews.save(new Audit(owner, "업로드 만료", List.of("주연"), NOW));
        job(expired.getId(), NOW.minusSeconds(61));
        assertEquals(new AuditProgress(1, 0, 0, 0, 0, 1), withoutStages(service.find(owner, expired.getId())));
        assertTrue(service.find(owner, expired.getId()).complete());
    }

    @Test
    void anotherProducerCannotReadProgress() {
        long other = members.save(new Member(UUID.randomUUID() + "@example.test", "password",
                MemberType.PRODUCER, MemberStatus.ACTIVE)).getId();
        BusinessException failure = assertThrows(BusinessException.class,
                () -> service.find(other, review.getId()));
        assertEquals(PDF_REVIEW_NOT_FOUND, failure.getErrorCode());
    }

    @Test
    void keepsPollingDuringAiAndFinishesEvenWhenAiFailsWithoutFailingThePdf() {
        PdfExtractionJob extracted = job(review.getId(), NOW.plusSeconds(600));
        extracted.receiveResult("COMPLETED", NOW);
        PdfAiJob aiJob = aiJobs.save(new PdfAiJob(extracted.getId(), review.getId(), owner, "[]", NOW));
        AuditProgress pending = service.find(owner, review.getId());
        assertEquals(new AuditProgress(1, 0, 1, 0, 0, 0), withoutStages(pending));
        assertEquals(new AuditProgress.AiStages(0, 1, 0, 0, 0, 0), pending.ai());
        String lease = aiJob.acquire(NOW, Duration.ofMinutes(2), "bedrock", "model", "v1");
        assertFalse(service.find(owner, review.getId()).complete());
        assertEquals(1, service.find(owner, review.getId()).ai().running());
        aiJob.fail(lease, "PROVIDER_ERROR", false, 3, NOW);
        AuditProgress failed = service.find(owner, review.getId());
        assertEquals(new AuditProgress(1, 0, 0, 1, 0, 0), withoutStages(failed));
        assertEquals(new AuditProgress.AiStages(0, 0, 0, 0, 1, 0), failed.ai());
        assertEquals(new AuditProgress.PdfStages(0, 0, 1, 0, 0), failed.pdf());
        assertTrue(failed.complete());
    }

    private AuditProgress withoutStages(AuditProgress progress) {
        return new AuditProgress(progress.total(), progress.uploading(), progress.waiting(), progress.completed(),
                progress.partial(), progress.failed(), progress.complete());
    }

    private PdfExtractionJob job(String reviewId, Instant expiresAt) {
        return jobs.save(new PdfExtractionJob(owner, "synthetic.pdf", 100, NOW, expiresAt, reviewId));
    }

    @TestConfiguration
    static class TestConfig {

        @Bean
        Clock clock() {
            return Clock.fixed(NOW, ZoneOffset.UTC);
        }
    }
}
