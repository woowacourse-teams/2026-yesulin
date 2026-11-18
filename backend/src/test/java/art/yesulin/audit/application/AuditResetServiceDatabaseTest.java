package art.yesulin.audit.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.audit.domain.AuditApplicantRepository;
import art.yesulin.audit.domain.AuditErrorCode;
import art.yesulin.audit.domain.AuditRepository;
import art.yesulin.auth.domain.member.Member;
import art.yesulin.auth.domain.member.MemberRepository;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.infrastructure.persistence.QueryDslConfiguration;
import art.yesulin.pdfextraction.application.FakePdfExtractionStorage;
import art.yesulin.pdfextraction.application.PdfExtractionService;
import art.yesulin.pdfextraction.domain.PdfExtractionJob;
import art.yesulin.pdfextraction.domain.PdfExtractionJobRepository;
import art.yesulin.pdfextraction.domain.PdfExtractionPayload;
import art.yesulin.pdfextraction.domain.PdfExtractionPayloadRepository;
import art.yesulin.pdfextraction.domain.ai.PdfAiJob;
import art.yesulin.pdfextraction.domain.ai.PdfAiJobRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

@DataJpaTest(showSql = false, properties = {
        "spring.datasource.url=jdbc:h2:mem:pdf-review-reset;MODE=MySQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000",
        "spring.jpa.hibernate.ddl-auto=validate", "yesulin.pdf-extraction.enabled=true",
        "yesulin.pdf-review.reset-enabled=true"
})
@ActiveProfiles("dev")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({AuditService.class, AuditResetService.class, PdfExtractionService.class,
        AuditResetServiceDatabaseTest.Config.class, QueryDslConfiguration.class})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class AuditResetServiceDatabaseTest {

    private static final Instant NOW = Instant.parse("2026-11-16T00:00:00Z");
    @Autowired
    private AuditService service;
    @Autowired
    private AuditResetService reset;
    @Autowired
    private MemberRepository members;
    @Autowired
    private AuditRepository reviews;
    @Autowired
    private AuditApplicantRepository entries;
    @Autowired
    private PdfExtractionJobRepository jobs;
    @Autowired
    private PdfExtractionPayloadRepository payloads;
    @Autowired
    private PdfAiJobRepository aiJobs;
    @Autowired
    private FakePdfExtractionStorage storage;

    @Test
    void resetRemovesEveryOwnedReviewWithItsSourcesAndFiles() {
        long ownerId = owner();
        String first = review(ownerId, List.of("남주", "여주"));
        String processed = settledUpload(ownerId, first, "a");
        payloads.saveAndFlush(new PdfExtractionPayload(processed, "{}", "c".repeat(64), NOW));
        aiJobs.saveAndFlush(new PdfAiJob(processed, first, ownerId, "[]", NOW));
        assignFirstRole(ownerId, first);
        final String other = settledUpload(ownerId, review(ownerId, List.of()), "b");

        AuditResetResult result = reset.resetOwned(ownerId);

        assertEquals(new AuditResetResult(2, 2), result);
        assertTrue(reviews.findByOwnerIdOrderByCreatedAtDesc(ownerId).isEmpty());
        assertEquals(0, entries.countByReviewId(first));
        assertTrue(jobs.findAllById(List.of(processed, other)).isEmpty());
        assertTrue(payloads.findById(processed).isEmpty() && aiJobs.findById(processed).isEmpty());
        assertTrue(storage.deletedJobs().containsAll(List.of(processed, other)));
    }

    @Test
    void resetRemovesEmptyReviews() {
        long ownerId = owner();
        review(ownerId, List.of("남주"));

        assertEquals(new AuditResetResult(1, 0), reset.resetOwned(ownerId));
    }

    @Test
    void resetKeepsOtherProducersReviews() {
        long ownerId = owner();
        long otherId = owner();
        settledUpload(ownerId, review(ownerId, List.of()), "d");
        String otherReview = review(otherId, List.of("앙상블"));
        String otherJob = settledUpload(otherId, otherReview, "e");

        reset.resetOwned(ownerId);

        assertEquals(1, service.find(otherId, otherReview).entries().size());
        assertTrue(jobs.findById(otherJob).isPresent());
    }

    @Test
    void resetRejectsWhileSourceIsStillProcessing() {
        long ownerId = owner();
        String reviewId = review(ownerId, List.of());
        String jobId = service.prepareUpload(ownerId, reviewId, "waiting.pdf", 100, "f".repeat(64)).jobId();

        BusinessException error = assertThrows(BusinessException.class, () -> reset.resetOwned(ownerId));

        assertEquals(AuditErrorCode.PDF_REVIEW_RESET_BUSY, error.getErrorCode());
        assertEquals(1, service.find(ownerId, reviewId).entries().size());
        assertTrue(jobs.findById(jobId).isPresent() && !storage.deletedJobs().contains(jobId));
    }

    @Test
    void failedFileRemovalKeepsReviewForRetry() {
        long ownerId = owner();
        String reviewId = review(ownerId, List.of());
        settledUpload(ownerId, reviewId, "9");
        storage.failNextDeletes(1);

        assertThrows(RuntimeException.class, () -> reset.resetOwned(ownerId));

        assertEquals(1, service.find(ownerId, reviewId).entries().size());
        assertEquals(new AuditResetResult(1, 1), reset.resetOwned(ownerId));
    }

    private long owner() {
        return members.save(new Member(UUID.randomUUID() + "@example.test", "password",
                MemberType.PRODUCER, MemberStatus.ACTIVE)).getId();
    }

    private String review(long ownerId, List<String> roles) {
        return service.create(ownerId, "초기화 검증", roles).id();
    }

    private String settledUpload(long ownerId, String reviewId, String seed) {
        String jobId = service.prepareUpload(ownerId, reviewId, seed + ".pdf", 100, seed.repeat(64)).jobId();
        PdfExtractionJob job = jobs.findById(jobId).orElseThrow();
        job.receiveResult("COMPLETED", NOW);
        jobs.saveAndFlush(job);
        return jobId;
    }

    private void assignFirstRole(long ownerId, String reviewId) {
        AuditDetail detail = service.find(ownerId, reviewId);
        List<String> entryIds = List.of(detail.entries().getFirst().id());
        service.assignRoles(ownerId, reviewId, entryIds, detail.roles().getFirst().id());
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
        FakePdfExtractionStorage storage() {
            return new FakePdfExtractionStorage();
        }
    }
}
