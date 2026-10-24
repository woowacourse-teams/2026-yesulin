package art.yesulin.pdfreview.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.text.Normalizer;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class PdfReviewAnalyzerTest {

    private static final Instant NOW = Instant.parse("2026-10-24T00:00:00Z");

    private final PdfReview review = new PdfReview(1L, "가을 정기공연", List.of("햄릿", "오필리아", "햄릿 왕자"), NOW);
    private final List<PdfReviewRole> roles = review.getRoles();

    @Test
    void matchesRoleAndNameFromExplicitLabelsOnTheSameLine() {
        PdfReviewAnalysis analysis = analyze("성명: 홍길동\n지원배역: 햄릿\n경력: 오필리아 역");

        assertEquals(PdfReviewMatchStatus.MATCHED, analysis.matchStatus());
        assertEquals(roleId("햄릿"), analysis.roleId());
        assertEquals("홍길동", analysis.applicantName());
    }

    @Test
    void readsValueFromTheLineRightAfterLoneLabel() {
        PdfReviewAnalysis analysis = analyze("이름\n김영희\n지원 배역\n오필리아\n");

        assertEquals(PdfReviewMatchStatus.MATCHED, analysis.matchStatus());
        assertEquals(roleId("오필리아"), analysis.roleId());
        assertEquals("김영희", analysis.applicantName());
    }

    @Test
    void readsRoleAndNameWrittenSideBySideOnOneLine() {
        PdfReviewAnalysis analysis = analyze("성명: 홍길동 지원배역: 햄릿 연락처: 010-0000-0000");

        assertEquals(PdfReviewMatchStatus.MATCHED, analysis.matchStatus());
        assertEquals(roleId("햄릿"), analysis.roleId());
        assertEquals("홍길동", analysis.applicantName());
    }

    @Test
    void roleNamesInCareerOrProseAreNeverAssigned() {
        PdfReviewAnalysis analysis = analyze("""
                출연 경력
                2020 연극 햄릿 - 햄릿 역
                경력: 햄릿, 오필리아
                저는 지난 공연에서 배역 햄릿을 맡았습니다.
                """);

        assertEquals(PdfReviewMatchStatus.NEEDS_CHECK, analysis.matchStatus());
        assertNull(analysis.roleId());
    }

    @Test
    void labeledRoleWinsOverCareerMentionOfAnotherRole() {
        PdfReviewAnalysis analysis = analyze("지원배역: 오필리아\n경력\n햄릿 역 (2020)\n배역: 햄릿");

        assertEquals(PdfReviewMatchStatus.MATCHED, analysis.matchStatus());
        assertEquals(roleId("오필리아"), analysis.roleId());
    }

    @Test
    void repeatedSameValueMatchesButDifferentValuesNeedCheck() {
        assertEquals(PdfReviewMatchStatus.MATCHED, analyze("지원배역: 햄릿\n\f지원배역: 햄릿").matchStatus());

        PdfReviewAnalysis different = analyze("지원배역: 햄릿\n희망배역: 오필리아");
        assertEquals(PdfReviewMatchStatus.NEEDS_CHECK, different.matchStatus());
        assertNull(different.roleId());
    }

    @Test
    void containingOrListingRoleNamesIsNotAnExactMatch() {
        assertEquals(PdfReviewMatchStatus.NEEDS_CHECK, analyze("지원배역: 햄릿 (주연)").matchStatus());
        assertEquals(PdfReviewMatchStatus.NEEDS_CHECK, analyze("지원배역: 햄릿, 오필리아").matchStatus());
        assertEquals(PdfReviewMatchStatus.NEEDS_CHECK, analyze("지원배역: 햄").matchStatus());
        assertEquals(PdfReviewMatchStatus.NEEDS_CHECK, analyze("지원분야: 배우").matchStatus());
    }

    @Test
    void emptyOrMissingTextKeepsEntryForChecking() {
        for (String text : new String[]{null, "", "  \n\t "}) {
            PdfReviewAnalysis analysis = analyze(text);

            assertEquals(PdfReviewMatchStatus.NEEDS_CHECK, analysis.matchStatus());
            assertNull(analysis.roleId());
            assertNull(analysis.applicantName());
        }
    }

    @Test
    void labelWithoutValueNeedsCheckButKeepsClearName() {
        PdfReviewAnalysis analysis = analyze("성명: 홍길동\n지원배역:");

        assertEquals(PdfReviewMatchStatus.NEEDS_CHECK, analysis.matchStatus());
        assertNull(analysis.roleId());
        assertEquals("홍길동", analysis.applicantName());
    }

    @Test
    void consecutiveLabelsInTableHeaderAreNotTakenAsValues() {
        PdfReviewAnalysis spaced = analyze("성명 생년월일 지원배역 연락처\n홍길동 1990.01.01 햄릿 010-0000-0000");
        assertEquals(PdfReviewMatchStatus.NEEDS_CHECK, spaced.matchStatus());
        assertNull(spaced.roleId());
        assertNull(spaced.applicantName());

        PdfReviewAnalysis piped = analyze("| 성명 | 생년월일 | 지원배역 | 연락처 |");
        assertNull(piped.applicantName());
        assertEquals(PdfReviewMatchStatus.NEEDS_CHECK, piped.matchStatus());

        PdfReviewAnalysis verticalHeader = analyze("성명\n생년월일\n지원배역\n연락처");
        assertNull(verticalHeader.applicantName());
        assertEquals(PdfReviewMatchStatus.NEEDS_CHECK, verticalHeader.matchStatus());
    }

    @Test
    void readsTableRowsWithCellSeparators() {
        PdfReviewAnalysis analysis = analyze("| 성명 | 홍길동 |\n| 지원배역 | 햄릿 |");

        assertEquals(PdfReviewMatchStatus.MATCHED, analysis.matchStatus());
        assertEquals(roleId("햄릿"), analysis.roleId());
        assertEquals("홍길동", analysis.applicantName());
    }

    @Test
    void nameIsNullUnlessOneClearValueExists() {
        assertNull(analyze("이름: 010-1234-5678").applicantName());
        assertNull(analyze("성명: 홍길동\n성명: 김철수").applicantName());
        assertNull(analyze("지원배역: 햄릿\n작품 이름: 오페라의 유령").applicantName());
        assertEquals("홍길동", analyze("성명 : 홍길동\n이름: 홍길동").applicantName());
    }

    @Test
    void matchesAcrossUnicodeNormalizationAndWhitespaceVariants() {
        String text = "성명： 홍길동\n지원 배역：　햄릿  왕자";

        PdfReviewAnalysis analysis = analyze(Normalizer.normalize(text, Normalizer.Form.NFD));

        assertEquals(PdfReviewMatchStatus.MATCHED, analysis.matchStatus());
        assertEquals(roleId("햄릿 왕자"), analysis.roleId());
        assertEquals("홍길동", analysis.applicantName());
    }

    @Test
    void evidenceFitsTheColumnEvenForVeryLongValues() {
        PdfReviewAnalysis analysis = analyze("지원배역: " + "가".repeat(5000));

        assertEquals(PdfReviewMatchStatus.NEEDS_CHECK, analysis.matchStatus());
        assertTrue(analysis.evidence().length() <= PdfReviewEntry.MAX_EVIDENCE_LENGTH);
    }

    private PdfReviewAnalysis analyze(String text) {
        return PdfReviewAnalyzer.analyze(text, roles);
    }

    private String roleId(String name) {
        return roles.stream().filter(role -> role.getName().equals(name)).findFirst().orElseThrow().getId();
    }
}
