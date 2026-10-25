package art.yesulin.pdfreview.application;

import static art.yesulin.pdfreview.domain.PdfReviewErrorCode.PDF_REVIEW_NOT_FOUND;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.auth.domain.member.Member;
import art.yesulin.auth.domain.member.MemberRepository;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.infrastructure.persistence.QueryDslConfiguration;
import art.yesulin.pdfextraction.domain.PdfExtractionJob;
import art.yesulin.pdfextraction.domain.PdfExtractionJobRepository;
import art.yesulin.pdfreview.domain.PdfReview;
import art.yesulin.pdfreview.domain.PdfReviewRepository;
import art.yesulin.pdfreview.infrastructure.QuerydslPdfReviewProgressQuery;
import java.time.Clock;
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
@Import({PdfReviewProgressService.class, QuerydslPdfReviewProgressQuery.class,
        QueryDslConfiguration.class, PdfReviewProgressServiceDatabaseTest.TestConfig.class})
class PdfReviewProgressServiceDatabaseTest {

    private static final Instant NOW = Instant.parse("2026-10-25T00:00:00Z");

    @Autowired
    private PdfReviewProgressService service;

    @Autowired
    private PdfReviewRepository reviews;

    @Autowired
    private PdfExtractionJobRepository jobs;

    @Autowired
    private MemberRepository members;

    private long owner;
    private PdfReview review;

    @BeforeEach
    void setUp() {
        owner = members.save(new Member(UUID.randomUUID() + "@example.test", "password",
                MemberType.PRODUCER, MemberStatus.ACTIVE)).getId();
        review = reviews.save(new PdfReview(owner, "가상 심사", List.of("앙상블"), NOW));
    }

    @Test
    void emptyReviewIsCompleteWithZeroCounts() {
        assertEquals(new PdfReviewProgress(0, 0, 0, 0, 0, 0), service.find(owner, review.getId()));
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
        PdfReview other = reviews.save(new PdfReview(owner, "다른 심사", List.of("주연"), NOW));
        job(other.getId(), NOW.plusSeconds(600));
        job(null, NOW.plusSeconds(600));

        PdfReviewProgress progress = service.find(owner, review.getId());

        assertEquals(new PdfReviewProgress(6, 1, 1, 1, 1, 2), progress);
        assertFalse(progress.complete());
        uploading.receiveResult("COMPLETED", NOW);
        waiting.receiveResult("COMPLETED", NOW);
        PdfReviewProgress finished = service.find(owner, review.getId());
        assertEquals(new PdfReviewProgress(6, 0, 0, 3, 1, 2), finished);
        assertTrue(finished.complete());
    }

    @Test
    void uploadGraceBoundaryRemainsUploadingAndExpiredUploadCountsAsFinishedFailure() {
        job(review.getId(), NOW.minusSeconds(60));
        assertEquals(new PdfReviewProgress(1, 1, 0, 0, 0, 0), service.find(owner, review.getId()));
        PdfReview expired = reviews.save(new PdfReview(owner, "업로드 만료", List.of("주연"), NOW));
        job(expired.getId(), NOW.minusSeconds(61));
        assertEquals(new PdfReviewProgress(1, 0, 0, 0, 0, 1), service.find(owner, expired.getId()));
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
