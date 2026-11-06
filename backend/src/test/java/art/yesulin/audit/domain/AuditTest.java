package art.yesulin.audit.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.global.exception.BusinessException;
import java.text.Normalizer;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class AuditTest {

    private static final Instant NOW = Instant.parse("2026-10-24T00:00:00Z");

    @Test
    void normalizesTitleAndRoleNamesAndKeepsRoleOrder() {
        String decomposed = Normalizer.normalize("  오필리아 ", Normalizer.Form.NFD);

        Audit review = new Audit(1L, "  가을\t정기공연  ", List.of("햄릿", decomposed, "햄릿  왕자"), NOW);

        assertEquals("가을 정기공연", review.getTitle());
        assertEquals(List.of("햄릿", "오필리아", "햄릿 왕자"),
                review.getRoles().stream().map(AuditRole::getName).toList());
        assertEquals(List.of(0, 1, 2),
                review.getRoles().stream().map(AuditRole::getRoleOrder).toList());
    }

    @Test
    void rejectsDuplicateRolesAfterNormalization() {
        String decomposed = Normalizer.normalize("햄릿", Normalizer.Form.NFD);

        assertThrows(BusinessException.class, () -> review("제목", List.of("햄릿", " 햄릿 ")));
        assertThrows(BusinessException.class, () -> review("제목", List.of("햄릿", decomposed)));
        assertThrows(BusinessException.class, () -> review("제목", List.of("햄릿 왕자", "햄릿   왕자")));
    }

    @Test
    void enforcesTitleAndRoleLimits() {
        assertThrows(BusinessException.class, () -> review(" ", List.of("햄릿")));
        assertThrows(BusinessException.class, () -> review("가".repeat(121), List.of("햄릿")));
        assertEquals(120, review("가".repeat(120), List.of("햄릿")).getTitle().length());
        assertEquals(List.of(), review("제목", List.of()).getRoles());
        assertThrows(BusinessException.class, () -> review("제목", null));
        assertThrows(BusinessException.class, () -> review("제목", List.of("가".repeat(101))));
        assertThrows(BusinessException.class, () -> review("제목", List.of("  ")));
        assertThrows(BusinessException.class, () -> review("제목\u0000", List.of("햄릿")));
        assertThrows(BusinessException.class, () -> review("제목", numberedRoles(51)));
        assertEquals(50, review("제목", numberedRoles(50)).getRoles().size());
    }

    @Test
    void editingMemoAndDecisionKeepsAutomaticFields() {
        AuditApplicant entry = new AuditApplicant("review", "job", "지원서.pdf");
        entry.applyAnalysis(new AuditAnalysis("홍길동", "role", AuditMatchStatus.MATCHED, "근거"));

        entry.review("목소리가 좋음", AuditDecision.HOLD);

        assertEquals("목소리가 좋음", entry.getMemo());
        assertEquals(AuditDecision.HOLD, entry.getDecision());
        assertEquals("홍길동", entry.getApplicantName());
        assertEquals("role", entry.getRoleId());
        assertEquals(AuditMatchStatus.MATCHED, entry.getMatchStatus());
    }

    @Test
    void analysisNeverOverwritesMemoOrDecision() {
        AuditApplicant entry = new AuditApplicant("review", "job", "지원서.pdf");
        entry.review("메모", AuditDecision.PASS);

        entry.applyAnalysis(new AuditAnalysis(null, null, AuditMatchStatus.NEEDS_CHECK, "근거"));

        assertEquals("메모", entry.getMemo());
        assertEquals(AuditDecision.PASS, entry.getDecision());
        assertEquals(AuditMatchStatus.NEEDS_CHECK, entry.getMatchStatus());
    }

    @Test
    void startsWaitingWithPendingDecisionAndRejectsTooLongMemo() {
        AuditApplicant entry = new AuditApplicant("review", "job", "지원서.pdf");

        assertEquals(AuditMatchStatus.WAITING, entry.getMatchStatus());
        assertEquals(AuditDecision.PENDING, entry.getDecision());
        assertEquals("", entry.getMemo());
        assertThrows(BusinessException.class, () -> entry.review("가".repeat(2001), AuditDecision.PASS));
        assertThrows(BusinessException.class, () -> entry.review("메모", null));
        entry.review("가".repeat(2000), AuditDecision.FAIL);
        assertEquals(2000, entry.getMemo().length());
    }

    @Test
    void truncatesEvidenceToTheColumnLimit() {
        AuditApplicant entry = new AuditApplicant("review", "job", "지원서.pdf");

        entry.applyAnalysis(new AuditAnalysis(null, null, AuditMatchStatus.NEEDS_CHECK, "가".repeat(3000)));

        assertEquals(AuditApplicant.MAX_EVIDENCE_LENGTH, entry.getMatchEvidence().length());
    }

    private Audit review(String title, List<String> roles) {
        return new Audit(1L, title, roles, NOW);
    }

    private List<String> numberedRoles(int count) {
        List<String> roles = new ArrayList<>();
        for (int number = 1; number <= count; number++) {
            roles.add("배역" + number);
        }
        return roles;
    }
}
