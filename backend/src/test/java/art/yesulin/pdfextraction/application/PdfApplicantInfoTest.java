package art.yesulin.pdfextraction.application;

import static art.yesulin.pdfextraction.application.PdfExtractionFixtures.MAPPER;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.global.exception.BusinessException;
import java.util.UUID;
import java.util.function.Consumer;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

class PdfApplicantInfoTest {

    private static final String ROLE_ID = UUID.randomUUID().toString();

    @Test
    void missingApplicantInfoIsAbsentButProvidedNullIsMalformed() {
        assertNull(PdfApplicantInfo.parse(MAPPER.createObjectNode().path("applicantInfo")));
        assertInvalidNode(MAPPER.nullNode());
    }

    @Test
    void completedInfoKeepsCanonicalFieldsAndTurnsBlankIntoNull() {
        ObjectNode node = completed();
        node.put("applicantNameEvidence", "  ");
        node.putNull("roleId");

        PdfApplicantInfo info = PdfApplicantInfo.parse(node);

        assertEquals("applicant-info-v1", info.version());
        assertEquals("홍길동", info.applicantName());
        assertNull(info.applicantNameEvidence());
        assertNull(info.roleId());
        assertEquals("", info.reason());
    }

    @Test
    void skippedWithoutProviderIsAcceptedAndCarriesNoProposal() {
        ObjectNode node = MAPPER.createObjectNode().put("version", "applicant-info-v1")
                .put("status", "SKIPPED").put("reason", "NO_TEXT");

        PdfApplicantInfo info = PdfApplicantInfo.parse(node);

        assertEquals("", info.provider());
        assertEquals("NO_TEXT", info.reason());
    }

    @Test
    void failedOrSkippedCannotCarryProposedValues() {
        PdfApplicantInfo clean = PdfApplicantInfo.parse(unfinished("FAILED"));
        assertNull(clean.applicantName());
        for (String field : new String[] {"applicantName", "applicantNameEvidence", "roleEvidence"}) {
            assertInvalidNode(unfinished("FAILED").put(field, "값"));
        }
        assertInvalidNode(unfinished("SKIPPED").put("roleId", ROLE_ID));
    }

    @Test
    void foreignOrOversizedOrMistypedValuesAreRejected() {
        assertInvalid(node -> node.put("version", "applicant-info-v2"));
        assertInvalid(node -> node.put("status", "DONE"));
        assertInvalid(node -> node.put("provider", "openai"));
        assertInvalid(node -> node.put("reason", "OTHER"));
        assertInvalid(node -> node.put("model", "m".repeat(151)));
        assertInvalid(node -> node.put("applicantName", "가".repeat(101)));
        assertInvalid(node -> node.put("roleEvidence", "가".repeat(501)));
        assertInvalid(node -> node.put("roleId", "not-a-uuid"));
        assertInvalid(node -> node.put("roleId", ROLE_ID.toUpperCase()));
        assertInvalid(node -> node.put("applicantName", 7));
        assertInvalid(node -> node.put("decision", "PASS"));
        assertInvalid(node -> node.put("applicantName", "홍\u0000길동"));
        assertInvalid(node -> node.remove("model"));
        assertInvalid(node -> node.remove("version"));
    }

    @Test
    void acceptsMaximumLengths() {
        ObjectNode node = completed();
        node.put("model", "m".repeat(150)).put("applicantName", "가".repeat(100))
                .put("roleEvidence", "가".repeat(500));

        assertEquals(100, PdfApplicantInfo.parse(node).applicantName().length());
    }

    @Test
    void statusAndReasonMustDescribeTheSameOutcome() {
        assertInvalid(node -> node.put("reason", "PROVIDER_ERROR"));
        assertInvalidNode(unfinished("FAILED").put("reason", "NO_TEXT"));
        assertInvalidNode(unfinished("FAILED").put("provider", ""));
        assertInvalidNode(unfinished("SKIPPED"));
    }

    private ObjectNode unfinished(String status) {
        return MAPPER.createObjectNode().put("version", "applicant-info-v1").put("status", status)
                .put("provider", "gemini").put("model", "model-1").put("reason", "PROVIDER_ERROR");
    }

    private ObjectNode completed() {
        return MAPPER.createObjectNode().put("version", "applicant-info-v1").put("status", "COMPLETED")
                .put("provider", "bedrock").put("model", "model-1").put("applicantName", "홍길동")
                .put("applicantNameEvidence", "성명 홍길동").put("roleId", ROLE_ID).put("roleEvidence", "햄릿");
    }

    private void assertInvalid(Consumer<ObjectNode> change) {
        ObjectNode node = completed();
        change.accept(node);
        assertInvalidNode(node);
    }

    private void assertInvalidNode(JsonNode node) {
        BusinessException exception = assertThrows(BusinessException.class, () -> PdfApplicantInfo.parse(node));
        assertEquals("INVALID_PDF_EXTRACTION_RESULT", exception.getErrorCode().code());
    }
}
