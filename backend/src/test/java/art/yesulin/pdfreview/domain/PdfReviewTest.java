package art.yesulin.pdfreview.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.global.exception.BusinessException;
import java.text.Normalizer;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class PdfReviewTest {

    private static final Instant NOW = Instant.parse("2026-10-24T00:00:00Z");

    @Test
    void normalizesTitleAndRoleNamesAndKeepsRoleOrder() {
        String decomposed = Normalizer.normalize("  오필리아 ", Normalizer.Form.NFD);

        PdfReview review = new PdfReview(1L, "  가을\t정기공연  ", List.of("햄릿", decomposed, "햄릿  왕자"), NOW);

        assertEquals("가을 정기공연", review.getTitle());
        assertEquals(List.of("햄릿", "오필리아", "햄릿 왕자"),
                review.getRoles().stream().map(PdfReviewRole::getName).toList());
        assertEquals(List.of(0, 1, 2),
                review.getRoles().stream().map(PdfReviewRole::getRoleOrder).toList());
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
        assertThrows(BusinessException.class, () -> review("제목", List.of()));
        assertThrows(BusinessException.class, () -> review("제목", null));
        assertThrows(BusinessException.class, () -> review("제목", List.of("가".repeat(101))));
        assertThrows(BusinessException.class, () -> review("제목", List.of("  ")));
        assertThrows(BusinessException.class, () -> review("제목\u0000", List.of("햄릿")));
        assertThrows(BusinessException.class, () -> review("제목", numberedRoles(51)));
        assertEquals(50, review("제목", numberedRoles(50)).getRoles().size());
    }

    @Test
    void editingMemoAndDecisionKeepsAutomaticFields() {
        PdfReviewEntry entry = new PdfReviewEntry("review", "job", "지원서.pdf");
        entry.applyAnalysis(new PdfReviewAnalysis("홍길동", "role", PdfReviewMatchStatus.MATCHED, "근거"));

        entry.review("목소리가 좋음", PdfReviewDecision.HOLD);

        assertEquals("목소리가 좋음", entry.getMemo());
        assertEquals(PdfReviewDecision.HOLD, entry.getDecision());
        assertEquals("홍길동", entry.getApplicantName());
        assertEquals("role", entry.getRoleId());
        assertEquals(PdfReviewMatchStatus.MATCHED, entry.getMatchStatus());
    }

    @Test
    void analysisNeverOverwritesMemoOrDecision() {
        PdfReviewEntry entry = new PdfReviewEntry("review", "job", "지원서.pdf");
        entry.review("메모", PdfReviewDecision.PASS);

        entry.applyAnalysis(new PdfReviewAnalysis(null, null, PdfReviewMatchStatus.NEEDS_CHECK, "근거"));

        assertEquals("메모", entry.getMemo());
        assertEquals(PdfReviewDecision.PASS, entry.getDecision());
        assertEquals(PdfReviewMatchStatus.NEEDS_CHECK, entry.getMatchStatus());
    }

    @Test
    void startsWaitingWithPendingDecisionAndRejectsTooLongMemo() {
        PdfReviewEntry entry = new PdfReviewEntry("review", "job", "지원서.pdf");

        assertEquals(PdfReviewMatchStatus.WAITING, entry.getMatchStatus());
        assertEquals(PdfReviewDecision.PENDING, entry.getDecision());
        assertEquals("", entry.getMemo());
        assertThrows(BusinessException.class, () -> entry.review("가".repeat(2001), PdfReviewDecision.PASS));
        assertThrows(BusinessException.class, () -> entry.review("메모", null));
        entry.review("가".repeat(2000), PdfReviewDecision.FAIL);
        assertEquals(2000, entry.getMemo().length());
    }

    @Test
    void truncatesEvidenceToTheColumnLimit() {
        PdfReviewEntry entry = new PdfReviewEntry("review", "job", "지원서.pdf");

        entry.applyAnalysis(new PdfReviewAnalysis(null, null, PdfReviewMatchStatus.NEEDS_CHECK, "가".repeat(3000)));

        assertEquals(PdfReviewEntry.MAX_EVIDENCE_LENGTH, entry.getMatchEvidence().length());
    }

    private PdfReview review(String title, List<String> roles) {
        return new PdfReview(1L, title, roles, NOW);
    }

    private List<String> numberedRoles(int count) {
        List<String> roles = new ArrayList<>();
        for (int number = 1; number <= count; number++) {
            roles.add("배역" + number);
        }
        return roles;
    }
}
