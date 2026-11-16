package art.yesulin.audit.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.audit.domain.AuditApplicantRepository;
import art.yesulin.audit.domain.AuditRepository;
import art.yesulin.auth.domain.member.Member;
import art.yesulin.auth.domain.member.MemberRepository;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.infrastructure.persistence.QueryDslConfiguration;
import art.yesulin.pdfextraction.application.FakePdfExtractionStorage;
import art.yesulin.pdfextraction.application.PdfExtractionService;
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
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

@DataJpaTest(showSql = false, properties = {
        "spring.datasource.url=jdbc:h2:mem:pdf-review-reset;MODE=MySQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000",
        "spring.jpa.hibernate.ddl-auto=validate", "yesulin.pdf-extraction.enabled=true",
        "yesulin.pdf-review.reset-enabled=true"
})
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
        String second = review(ownerId, List.of());
        String processed = upload(ownerId, first, "a");
        payloads.saveAndFlush(new PdfExtractionPayload(processed, "{}", "c".repeat(64), NOW));
        aiJobs.saveAndFlush(new PdfAiJob(processed, first, ownerId, "[]", NOW));
        final String waiting = upload(ownerId, second, "b");

        AuditResetResult result = reset.resetOwned(ownerId);

        assertEquals(new AuditResetResult(2, 2), result);
        assertTrue(reviews.findByOwnerIdOrderByCreatedAtDesc(ownerId).isEmpty());
        assertEquals(0, entries.countByReviewId(first) + entries.countByReviewId(second));
        assertTrue(jobs.findAllById(List.of(processed, waiting)).isEmpty());
        assertTrue(payloads.findById(processed).isEmpty());
        assertTrue(aiJobs.findById(processed).isEmpty());
        assertTrue(storage.deletedJobs().containsAll(List.of(processed, waiting)));
    }

    @Test
    void resetKeepsOtherProducersReviews() {
        long ownerId = owner();
        long otherId = owner();
        upload(ownerId, review(ownerId, List.of()), "d");
        String otherReview = review(otherId, List.of("앙상블"));
        String otherJob = upload(otherId, otherReview, "e");

        reset.resetOwned(ownerId);

        assertEquals(1, service.find(otherId, otherReview).entries().size());
        assertTrue(jobs.findById(otherJob).isPresent());
    }

    @Test
    void resetWithoutReviewsDeletesNothing() {
        assertEquals(new AuditResetResult(0, 0), reset.resetOwned(owner()));
    }

    @Test
    void failedFileRemovalKeepsReviewForRetry() {
        long ownerId = owner();
        String reviewId = review(ownerId, List.of());
        upload(ownerId, reviewId, "f");
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

    private String upload(long ownerId, String reviewId, String seed) {
        return service.prepareUpload(ownerId, reviewId, seed + ".pdf", 100, seed.repeat(64)).jobId();
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
