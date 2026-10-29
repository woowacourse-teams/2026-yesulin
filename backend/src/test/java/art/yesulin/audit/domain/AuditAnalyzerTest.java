package art.yesulin.audit.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.text.Normalizer;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class AuditAnalyzerTest {

    private static final Instant NOW = Instant.parse("2026-10-24T00:00:00Z");

    private final Audit review = new Audit(1L, "가을 정기공연", List.of("햄릿", "오필리아", "햄릿 왕자"), NOW);
    private final List<AuditRole> roles = review.getRoles();

    @Test
    void matchesRoleAndNameFromExplicitLabelsOnTheSameLine() {
        AuditAnalysis analysis = analyze("성명: 홍길동\n지원배역: 햄릿\n경력: 오필리아 역");

        assertEquals(AuditMatchStatus.MATCHED, analysis.matchStatus());
        assertEquals(roleId("햄릿"), analysis.roleId());
        assertEquals("홍길동", analysis.applicantName());
    }

    @Test
    void readsValueFromTheLineRightAfterLoneLabel() {
        AuditAnalysis analysis = analyze("이름\n김영희\n지원 배역\n오필리아\n");

        assertEquals(AuditMatchStatus.MATCHED, analysis.matchStatus());
        assertEquals(roleId("오필리아"), analysis.roleId());
        assertEquals("김영희", analysis.applicantName());
    }

    @Test
    void readsRoleAndNameWrittenSideBySideOnOneLine() {
        AuditAnalysis analysis = analyze("성명: 홍길동 지원배역: 햄릿 연락처: 010-0000-0000");

        assertEquals(AuditMatchStatus.MATCHED, analysis.matchStatus());
        assertEquals(roleId("햄릿"), analysis.roleId());
        assertEquals("홍길동", analysis.applicantName());
    }

    @Test
    void roleNamesInCareerOrProseAreNeverAssigned() {
        AuditAnalysis analysis = analyze("""
                출연 경력
                2020 연극 햄릿 - 햄릿 역
                경력: 햄릿, 오필리아
                저는 지난 공연에서 배역 햄릿을 맡았습니다.
                """);

        assertEquals(AuditMatchStatus.NEEDS_CHECK, analysis.matchStatus());
        assertNull(analysis.roleId());
    }

    @Test
    void labeledRoleWinsOverCareerMentionOfAnotherRole() {
        AuditAnalysis analysis = analyze("지원배역: 오필리아\n경력\n햄릿 역 (2020)\n배역: 햄릿");

        assertEquals(AuditMatchStatus.MATCHED, analysis.matchStatus());
        assertEquals(roleId("오필리아"), analysis.roleId());
    }

    @Test
    void repeatedSameValueMatchesButDifferentValuesNeedCheck() {
        assertEquals(AuditMatchStatus.MATCHED, analyze("지원배역: 햄릿\n\f지원배역: 햄릿").matchStatus());

        AuditAnalysis different = analyze("지원배역: 햄릿\n희망배역: 오필리아");
        assertEquals(AuditMatchStatus.NEEDS_CHECK, different.matchStatus());
        assertNull(different.roleId());
    }

    @Test
    void containingOrListingRoleNamesIsNotAnExactMatch() {
        assertEquals(AuditMatchStatus.NEEDS_CHECK, analyze("지원배역: 햄릿 (주연)").matchStatus());
        assertEquals(AuditMatchStatus.NEEDS_CHECK, analyze("지원배역: 햄릿, 오필리아").matchStatus());
        assertEquals(AuditMatchStatus.NEEDS_CHECK, analyze("지원배역: 햄").matchStatus());
        assertEquals(AuditMatchStatus.NEEDS_CHECK, analyze("지원분야: 배우").matchStatus());
    }

    @Test
    void emptyOrMissingTextKeepsEntryForChecking() {
        for (String text : new String[]{null, "", "  \n\t "}) {
            AuditAnalysis analysis = analyze(text);

            assertEquals(AuditMatchStatus.NEEDS_CHECK, analysis.matchStatus());
            assertNull(analysis.roleId());
            assertNull(analysis.applicantName());
        }
    }

    @Test
    void labelWithoutValueNeedsCheckButKeepsClearName() {
        AuditAnalysis analysis = analyze("성명: 홍길동\n지원배역:");

        assertEquals(AuditMatchStatus.NEEDS_CHECK, analysis.matchStatus());
        assertNull(analysis.roleId());
        assertEquals("홍길동", analysis.applicantName());
    }

    @Test
    void consecutiveLabelsInTableHeaderAreNotTakenAsValues() {
        AuditAnalysis spaced = analyze("성명 생년월일 지원배역 연락처\n홍길동 1990.01.01 햄릿 010-0000-0000");
        assertEquals(AuditMatchStatus.NEEDS_CHECK, spaced.matchStatus());
        assertNull(spaced.roleId());
        assertNull(spaced.applicantName());

        AuditAnalysis piped = analyze("| 성명 | 생년월일 | 지원배역 | 연락처 |");
        assertNull(piped.applicantName());
        assertEquals(AuditMatchStatus.NEEDS_CHECK, piped.matchStatus());

        AuditAnalysis verticalHeader = analyze("성명\n생년월일\n지원배역\n연락처");
        assertNull(verticalHeader.applicantName());
        assertEquals(AuditMatchStatus.NEEDS_CHECK, verticalHeader.matchStatus());
    }

    @Test
    void readsTableRowsWithCellSeparators() {
        AuditAnalysis analysis = analyze("| 성명 | 홍길동 |\n| 지원배역 | 햄릿 |");

        assertEquals(AuditMatchStatus.MATCHED, analysis.matchStatus());
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

        AuditAnalysis analysis = analyze(Normalizer.normalize(text, Normalizer.Form.NFD));

        assertEquals(AuditMatchStatus.MATCHED, analysis.matchStatus());
        assertEquals(roleId("햄릿 왕자"), analysis.roleId());
        assertEquals("홍길동", analysis.applicantName());
    }

    @Test
    void evidenceFitsTheColumnEvenForVeryLongValues() {
        AuditAnalysis analysis = analyze("지원배역: " + "가".repeat(5000));

        assertEquals(AuditMatchStatus.NEEDS_CHECK, analysis.matchStatus());
        assertTrue(analysis.evidence().length() <= AuditApplicant.MAX_EVIDENCE_LENGTH);
    }

    private AuditAnalysis analyze(String text) {
        return AuditAnalyzer.analyze(text, roles);
    }

    private String roleId(String name) {
        return roles.stream().filter(role -> role.getName().equals(name)).findFirst().orElseThrow().getId();
    }
}
