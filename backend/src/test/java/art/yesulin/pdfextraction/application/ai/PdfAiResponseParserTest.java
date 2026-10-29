package art.yesulin.pdfextraction.application.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.pdfextraction.application.PdfApplicantInfo;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class PdfAiResponseParserTest {

    private static final String ROLE_ID = "11111111-1111-4111-8111-111111111111";
    private static final List<PdfAiRole> ROLES = List.of(new PdfAiRole(ROLE_ID, "가상역"));
    private static final String SOURCE = """
            성명: 김가상
            지원 배역: 가상역
            나이: 만 29세
            키: 165cm
            경력: 가상극 2025.08 ~ 12
            """;
    private static final String FULL = """
            {"applicantName":"김가상","applicantNameEvidence":"성명: 김가상",
             "roleId":"%s","roleEvidence":"지원 배역: 가상역",
             "profile":{"birthDate":{"value":null,"evidence":null},
               "age":{"value":"만 29세","evidence":"나이: 만 29세"},
               "height":{"value":"165cm","evidence":"키: 165cm"},
               "education":{"value":null,"evidence":null},
               "careers":[{"title":"가상극","venue":null,"part":null,"genre":null,
                 "period":"2025.08 ~ 12","company":null,"evidence":"경력: 가상극 2025.08 ~ 12"}]}}
            """.formatted(ROLE_ID);

    private final PdfAiResponseParser parser = new PdfAiResponseParser(JsonMapper.builder().build());

    @Test
    void parsesCompleteResponseIntoCompletedV2Info() {
        PdfApplicantInfo info = parse(FULL);

        assertEquals("applicant-info-v2", info.version());
        assertEquals("COMPLETED", info.status());
        assertEquals("bedrock", info.provider());
        assertEquals("test-model", info.model());
        assertEquals("김가상", info.applicantName());
        assertEquals(ROLE_ID, info.roleId());
        assertEquals("만 29세", info.profile().age().value());
        assertNull(info.profile().birthDate().value());
        assertEquals(1, info.profile().careers().size());
    }

    @Test
    void treatsMissingOptionalFieldsAsNull() {
        PdfApplicantInfo empty = parse("{}");
        assertNull(empty.applicantName());
        assertNull(empty.roleId());
        assertNull(empty.profile());

        PdfApplicantInfo partial = parse("""
                {"profile":{"height":{"value":"165cm","evidence":"키: 165cm"},
                 "careers":[{"title":"가상극","evidence":"경력: 가상극 2025.08 ~ 12"}]}}
                """);
        assertEquals("165cm", partial.profile().height().value());
        assertNull(partial.profile().age().value());
        assertNull(partial.profile().careers().get(0).part());
    }

    @Test
    void clearsEvidenceWhenValueIsNull() {
        PdfApplicantInfo info = parse("""
                {"applicantName":null,"applicantNameEvidence":"성명: 김가상",
                 "roleId":null,"roleEvidence":"지원 배역: 가상역","profile":null}
                """);

        assertNull(info.applicantNameEvidence());
        assertNull(info.roleEvidence());
    }

    @Test
    void rejectsNonRawJson() {
        assertInvalid("```json\n" + FULL + "\n```");
        assertInvalid("답변: " + FULL);
        assertInvalid(FULL + FULL);
        assertInvalid("[]");
        assertInvalid("");
        assertInvalid("{\"applicantName\":\"김가상\",\"applicantName\":\"김가상\"}");
    }

    @Test
    void rejectsUnknownFields() {
        assertInvalid("{\"score\":1}");
        assertInvalid(FULL.replace("\"profile\":{", "\"profile\":{\"score\":1,"));
        assertInvalid(FULL.replace("\"company\":null,", "\"company\":null,\"link\":\"x\","));
    }

    @Test
    void rejectsOversizedResponse() {
        assertInvalid("{\"applicantName\":\"" + "가".repeat(PdfAiResponseParser.MAX_RESPONSE_SIZE) + "\"}");
    }

    @Test
    void rejectsNameWithoutOriginalEvidence() {
        assertInvalid("{\"applicantName\":\"김가상\"}");
        assertInvalid(FULL.replace("\"applicantNameEvidence\":\"성명: 김가상\"",
                "\"applicantNameEvidence\":\"성명: 이가상\""));
        assertInvalid(FULL.replace("\"applicantName\":\"김가상\"", "\"applicantName\":\"박가상\""));
    }

    @Test
    void rejectsRoleOutsideAllowedRolesOrWithoutEvidence() {
        String otherRole = "22222222-2222-4222-8222-222222222222";
        assertInvalid(FULL.replace(ROLE_ID, otherRole));
        assertInvalid("{\"roleId\":\"" + ROLE_ID + "\"}");
        assertInvalid(FULL.replace("\"roleEvidence\":\"지원 배역: 가상역\"", "\"roleEvidence\":\"지원 배역: 다른역\""));
    }

    @Test
    void rejectsProfileFactsNotBackedBySource() {
        assertInvalid(FULL.replace("\"value\":\"165cm\"", "\"value\":\"170cm\""));
        assertInvalid(FULL.replace("\"evidence\":\"키: 165cm\"", "\"evidence\":\"키: 170cm\""));
        assertInvalid(FULL.replace("\"value\":null,\"evidence\":null", "\"value\":\"1996\",\"evidence\":null"));
    }

    @Test
    void rejectsMoreThanFiveCareers() {
        String career = "{\"title\":\"가상극\",\"evidence\":\"경력: 가상극 2025.08 ~ 12\"}";
        String six = String.join(",", Collections.nCopies(6, career));
        String five = String.join(",", Collections.nCopies(5, career));

        assertInvalid("{\"profile\":{\"careers\":[" + six + "]}}");
        parse("{\"profile\":{\"careers\":[" + five + "]}}");
    }

    @Test
    void failureNeverExposesSourceOrResponse() {
        PdfAiFailure failure = assertThrows(PdfAiFailure.class,
                () -> parser.parse("비밀응답 {", SOURCE, ROLES, "bedrock", "test-model"));

        assertEquals("INVALID_MODEL_OUTPUT", failure.code());
        assertFalse(failure.retryable());
        assertEquals("INVALID_MODEL_OUTPUT", failure.getMessage());
        assertNull(failure.getCause());
    }

    private PdfApplicantInfo parse(String response) {
        return parser.parse(response, SOURCE, ROLES, "bedrock", "test-model");
    }

    private void assertInvalid(String response) {
        PdfAiFailure failure = assertThrows(PdfAiFailure.class, () -> parse(response));
        assertEquals("INVALID_MODEL_OUTPUT", failure.code());
        assertFalse(failure.retryable());
    }
}
