package art.yesulin.audit.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class AuditApplicantStatusTest {

    @Test
    void startsAsUploadingWithoutTouchingDecisionOrRoleMatch() {
        AuditApplicant applicant = applicant();

        assertEquals(AuditApplicantStatus.UPLOADING, applicant.getProcessingStatus());
        assertEquals(AuditDecision.PENDING, applicant.getDecision());
        assertEquals(AuditMatchStatus.WAITING, applicant.getMatchStatus());
    }

    @Test
    void startExtractionOnlyAdvancesFromUploading() {
        AuditApplicant applicant = applicant();
        applicant.startExtraction();
        assertEquals(AuditApplicantStatus.EXTRACTING, applicant.getProcessingStatus());

        applicant.markReady();
        applicant.startExtraction();
        assertEquals(AuditApplicantStatus.READY, applicant.getProcessingStatus());
    }

    @Test
    void needsReviewKeepsExtractedAndManualFields() {
        AuditApplicant applicant = applicant();
        applicant.applyAnalysis(new AuditAnalysis("가상배우", "role-1", AuditMatchStatus.MATCHED, "근거"));
        applicant.review("메모", AuditDecision.PASS);
        applicant.markEnriching();

        applicant.markNeedsReview();

        assertEquals(AuditApplicantStatus.NEEDS_REVIEW, applicant.getProcessingStatus());
        assertEquals("가상배우", applicant.getApplicantName());
        assertEquals("role-1", applicant.getRoleId());
        assertEquals("메모", applicant.getMemo());
        assertEquals(AuditDecision.PASS, applicant.getDecision());
    }

    @Test
    void manualReviewDoesNotChangeProcessingStatus() {
        AuditApplicant applicant = applicant();
        applicant.markEnriching();

        applicant.review("메모", AuditDecision.HOLD);
        applicant.assignRole("role-1");

        assertEquals(AuditApplicantStatus.ENRICHING, applicant.getProcessingStatus());
    }

    private AuditApplicant applicant() {
        return new AuditApplicant("review-1", "job-1", "synthetic.pdf");
    }
}
