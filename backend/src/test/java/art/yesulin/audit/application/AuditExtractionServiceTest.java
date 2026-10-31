package art.yesulin.audit.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import art.yesulin.audit.domain.Audit;
import art.yesulin.audit.domain.AuditAnalysis;
import art.yesulin.audit.domain.AuditApplicant;
import art.yesulin.audit.domain.AuditApplicantRepository;
import art.yesulin.audit.domain.AuditApplicantStatus;
import art.yesulin.audit.domain.AuditDecision;
import art.yesulin.audit.domain.AuditMatchStatus;
import art.yesulin.audit.domain.AuditRepository;
import art.yesulin.pdfextraction.application.PdfApplicantInfo;
import art.yesulin.pdfextraction.application.ai.PdfAiQueueService;
import art.yesulin.pdfextraction.domain.ai.PdfAiJob;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.function.Consumer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class AuditExtractionServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-29T00:00:00Z");
    private static final long OWNER = 7L;

    private AuditRepository reviews;
    private AuditApplicantRepository entries;
    private PdfAiQueueService aiJobs;
    private AuditExtractionService service;
    private Audit review;
    private AuditApplicant applicant;

    @BeforeEach
    void setUp() {
        reviews = mock(AuditRepository.class);
        entries = mock(AuditApplicantRepository.class);
        aiJobs = mock(PdfAiQueueService.class);
        service = new AuditExtractionService(reviews, entries, aiJobs);
        review = new Audit(OWNER, "가상 심사", List.of("앙상블"), NOW);
        applicant = new AuditApplicant(review.getId(), "job-1", "synthetic.pdf");
        when(entries.findByJobIdForUpdate("job-1")).thenReturn(Optional.of(applicant));
        when(reviews.findByIdAndOwnerId(review.getId(), OWNER)).thenReturn(Optional.of(review));
    }

    @Test
    void sharedUploadEventStartsExtractionWithoutOverwritingLaterProcessingStatus() {
        service.startExtraction("job-1");
        assertEquals(AuditApplicantStatus.EXTRACTING, applicant.getProcessingStatus());
        applicant.markReady();
        service.startExtraction("job-1");
        assertEquals(AuditApplicantStatus.READY, applicant.getProcessingStatus());
    }

    @Test
    void pendingAiJobMovesApplicantToEnriching() {
        givenAiJob(job -> {});

        service.applyExtraction("job-1", OWNER, "이름: 가상배우");

        assertEquals(AuditApplicantStatus.ENRICHING, applicant.getProcessingStatus());
        assertEquals(AuditDecision.PENDING, applicant.getDecision());
    }

    @Test
    void legacyCompletedSkipMakesApplicantReady() {
        givenAiJob(job -> job.skip("LEGACY_COMPLETED", NOW));

        service.applyExtraction("job-1", OWNER, "이름: 가상배우");

        assertEquals(AuditApplicantStatus.READY, applicant.getProcessingStatus());
    }

    @Test
    void failedExtractionMarksApplicantFailed() {
        givenAiJob(job -> job.skip("EXTRACTION_FAILED", NOW));

        service.applyExtraction("job-1", OWNER, "");

        assertEquals(AuditApplicantStatus.FAILED, applicant.getProcessingStatus());
    }

    @Test
    void skippedAiOrMissingTextNeedsReview() {
        givenAiJob(job -> job.skip("NO_TEXT", NOW));

        service.applyExtraction("job-1", OWNER, "");

        assertEquals(AuditApplicantStatus.NEEDS_REVIEW, applicant.getProcessingStatus());
    }

    @Test
    void aiSuccessMakesApplicantReady() {
        applicant.markEnriching();
        PdfApplicantInfo info = new PdfApplicantInfo("applicant-info-v2", "COMPLETED", "bedrock", "test-model",
                "가상배우", "이름: 가상배우", null, null, "");

        service.applyAi("job-1", OWNER, "이름: 가상배우", info);

        assertEquals(AuditApplicantStatus.READY, applicant.getProcessingStatus());
        assertEquals("가상배우", applicant.getApplicantName());
    }

    @Test
    void aiFailureNeedsReviewAndKeepsExtractedAndManualFields() {
        applicant.applyAnalysis(new AuditAnalysis("가상배우", null, AuditMatchStatus.NEEDS_CHECK, "근거"));
        applicant.review("메모", AuditDecision.HOLD);
        applicant.markEnriching();

        service.applyAiFailure("job-1");

        assertEquals(AuditApplicantStatus.NEEDS_REVIEW, applicant.getProcessingStatus());
        assertEquals("가상배우", applicant.getApplicantName());
        assertEquals("메모", applicant.getMemo());
        assertEquals(AuditDecision.HOLD, applicant.getDecision());
    }

    @Test
    void retryAndItsResultPreserveManualRoleMemoAndDecision() {
        applicant.assignRole("manual-role");
        applicant.review("유지할 메모", AuditDecision.HOLD);
        applicant.markNeedsReview();

        service.restartAnalysis("job-1");
        assertEquals(AuditApplicantStatus.ENRICHING, applicant.getProcessingStatus());
        assertEquals("manual-role", applicant.getRoleId());
        assertEquals("유지할 메모", applicant.getMemo());
        assertEquals(AuditDecision.HOLD, applicant.getDecision());

        PdfApplicantInfo info = new PdfApplicantInfo("applicant-info-v2", "COMPLETED", "bedrock", "test-model",
                "가상배우", "이름: 가상배우", null, null, "");
        service.applyAi("job-1", OWNER, "이름: 가상배우", info);
        assertEquals(AuditApplicantStatus.READY, applicant.getProcessingStatus());
        assertEquals("manual-role", applicant.getRoleId());
        assertEquals("유지할 메모", applicant.getMemo());
        assertEquals(AuditDecision.HOLD, applicant.getDecision());
    }

    private void givenAiJob(Consumer<PdfAiJob> setup) {
        PdfAiJob job = new PdfAiJob("job-1", review.getId(), OWNER, "[]", NOW);
        setup.accept(job);
        when(aiJobs.enqueue(eq("job-1"), eq(review.getId()), eq(OWNER), any(), any(), isNull())).thenReturn(job);
    }
}
