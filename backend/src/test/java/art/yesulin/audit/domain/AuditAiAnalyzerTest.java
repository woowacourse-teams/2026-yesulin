package art.yesulin.audit.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class AuditAiAnalyzerTest {

    private static final String TEXT = "성명 : 홍길동\n지원 배역\n햄릿 (주연)\n연락처 010";

    private final Audit review = new Audit(1L, "제목", List.of("햄릿", "오필리아"),
            Instant.parse("2026-10-24T00:00:00Z"));
    private final String hamlet = review.getRoles().get(0).getId();

    @Test
    void groundedNameAndRoleAreMatched() {
        AuditAnalysis analysis = analyze(TEXT, proposal("홍길동", "성명 : 홍길동", hamlet, "지원 배역 햄릿 (주연)"));

        assertEquals("홍길동", analysis.applicantName());
        assertEquals(hamlet, analysis.roleId());
        assertEquals(AuditMatchStatus.MATCHED, analysis.matchStatus());
        assertTrue(analysis.evidence().contains("AI"));
        assertTrue(analysis.evidence().contains("지원 배역 햄릿 (주연)"));
    }

    @Test
    void evidenceMatchesAcrossLineBreaksAndWhitespaceOnly() {
        assertEquals(AuditMatchStatus.MATCHED,
                analyze(TEXT, proposal(null, null, hamlet, "지원  배역\n햄릿")).matchStatus());
        assertEquals(AuditMatchStatus.NEEDS_CHECK,
                analyze(TEXT, proposal(null, null, hamlet, "지원배역 햄릿")).matchStatus());
    }

    @Test
    void hallucinatedRoleEvidenceIsRejectedButGroundedNameIsKept() {
        AuditAnalysis analysis = analyze(TEXT,
                proposal("홍길동", "성명 : 홍길동", hamlet, "지원 배역 오셀로"));

        assertEquals("홍길동", analysis.applicantName());
        assertNull(analysis.roleId());
        assertEquals(AuditMatchStatus.NEEDS_CHECK, analysis.matchStatus());
    }

    @Test
    void ungroundedNameIsDroppedWithoutBlockingGroundedRole() {
        AuditAnalysis analysis = analyze(TEXT,
                proposal("김철수", "성명 : 김철수", hamlet, "햄릿 (주연)"));

        assertNull(analysis.applicantName());
        assertEquals(hamlet, analysis.roleId());
        assertEquals(AuditMatchStatus.MATCHED, analysis.matchStatus());
    }

    @Test
    void nameMustAppearInsideItsOwnEvidence() {
        AuditAnalysis analysis = analyze(TEXT, proposal("홍길동", "연락처 010", null, null));

        assertNull(analysis.applicantName());
    }

    @Test
    void blankEvidenceNeverGroundsAnything() {
        AuditAnalysis analysis = analyze(TEXT, proposal("홍길동", " ", hamlet, null));

        assertNull(analysis.applicantName());
        assertNull(analysis.roleId());
    }

    @Test
    void roleOutsideThisReviewIsRejectedEvenWhenQuoted() {
        AuditAnalysis analysis = analyze(TEXT,
                proposal("홍길동", "성명 : 홍길동", UUID.randomUUID().toString(), "햄릿 (주연)"));

        assertNull(analysis.roleId());
        assertEquals("홍길동", analysis.applicantName());
        assertEquals(AuditMatchStatus.NEEDS_CHECK, analysis.matchStatus());
    }

    @Test
    void unresolvedRoleKeepsVerifiedNameAndNeedsCheck() {
        AuditAnalysis analysis = analyze(TEXT, proposal("홍길동", "성명 : 홍길동", null, null));

        assertEquals("홍길동", analysis.applicantName());
        assertNull(analysis.roleId());
        assertEquals(AuditMatchStatus.NEEDS_CHECK, analysis.matchStatus());
    }

    @Test
    void failedOrSkippedAnalysisInventsNothingAndExplainsWhy() {
        for (String reason : List.of("NO_TEXT", "TEXT_LIMIT_EXCEEDED", "PROVIDER_ERROR", "INVALID_MODEL_OUTPUT", "")) {
            AuditAnalysis analysis = AuditAiAnalyzer.analyze(TEXT, review.getRoles(),
                    new AuditAiProposal(false, reason, "홍길동", "성명 : 홍길동", hamlet, "햄릿"));

            assertNull(analysis.applicantName());
            assertNull(analysis.roleId());
            assertEquals(AuditMatchStatus.NEEDS_CHECK, analysis.matchStatus());
            assertTrue(analysis.evidence().contains("직접 확인"));
        }
    }

    @Test
    void roleNameIsNotMatchedFuzzilyOrBySuffix() {
        AuditAnalysis analysis = analyze("지원배역: 햄릿역", proposal(null, null, hamlet, "지원배역: 햄릿"));

        assertEquals(AuditMatchStatus.MATCHED, analysis.matchStatus());
        assertNull(analyze("지원배역: 햄릿역", proposal(null, null, hamlet, "지원배역: 햄릿 역")).roleId());
    }

    private AuditAnalysis analyze(String text, AuditAiProposal proposal) {
        return AuditAiAnalyzer.analyze(text, review.getRoles(), proposal);
    }

    private AuditAiProposal proposal(String name, String nameEvidence, String roleId, String roleEvidence) {
        return new AuditAiProposal(true, "", name, nameEvidence, roleId, roleEvidence);
    }
}
