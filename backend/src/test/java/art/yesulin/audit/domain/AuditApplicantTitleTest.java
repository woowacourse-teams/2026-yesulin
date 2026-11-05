package art.yesulin.audit.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.global.exception.BusinessException;
import org.junit.jupiter.api.Test;

class AuditApplicantTitleTest {

    @Test
    void missingDisplayTitleUsesOriginalFilenameAndRenameOnlyChangesDisplayTitle() {
        AuditApplicant entry = AuditApplicant.forManualReview("review", "job", "source.pdf");
        assertEquals("source.pdf", entry.getTitle());
        entry.review("메모", AuditDecision.PASS);
        entry.rename("  배우   지원서 ");
        assertEquals("배우 지원서", entry.getTitle());
        assertEquals("source.pdf", entry.getOriginalFilename());
        assertEquals("job", entry.getJobId());
        assertEquals("메모", entry.getMemo());
        assertEquals(AuditDecision.PASS, entry.getDecision());
    }

    @Test
    void rejectsInvalidTitlesWithoutChangingThePreviousTitle() {
        AuditApplicant entry = AuditApplicant.forManualReview("review", "job", "source.pdf");
        assertThrows(BusinessException.class, () -> entry.rename("  "));
        assertThrows(BusinessException.class, () -> entry.rename("가".repeat(256)));
        assertThrows(BusinessException.class, () -> entry.rename(null));
        assertEquals("source.pdf", entry.getTitle());
    }

    @Test
    void extractionAndAiCannotAutomaticallyAssignTheManualReviewsRole() {
        AuditApplicant entry = AuditApplicant.forManualReview("review", "job", "source.pdf");
        entry.applyAnalysis(new AuditAnalysis("배우", "auto-role", AuditMatchStatus.MATCHED, "추출"));
        entry.applyAiAnalysis(new AuditAnalysis("배우", "auto-role", AuditMatchStatus.MATCHED, "AI"));
        assertTrue(entry.isRoleManuallyAssigned());
        assertNull(entry.getRoleId());
        assertEquals(AuditMatchStatus.NEEDS_CHECK, entry.getMatchStatus());
        entry.assignRole("manual-role");
        entry.applyAiAnalysis(new AuditAnalysis("배우", "other-role", AuditMatchStatus.MATCHED, "AI"));
        assertEquals("manual-role", entry.getRoleId());
    }
}
