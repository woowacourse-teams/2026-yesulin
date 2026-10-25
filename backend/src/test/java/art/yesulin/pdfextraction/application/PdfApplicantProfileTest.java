package art.yesulin.pdfextraction.application;

import static art.yesulin.pdfextraction.application.PdfExtractionFixtures.MAPPER;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.global.exception.BusinessException;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.node.ObjectNode;

class PdfApplicantProfileTest {

    private static final String PROFILE = """
            {"birthDate":{"value":null,"evidence":null},"age":{"value":null,"evidence":null},
             "height":{"value":"165cm","evidence":"키: 165cm"},
             "education":{"value":null,"evidence":null},"careers":[
               {"title":"가상극","venue":null,"part":null,"genre":null,"period":"25.08 ~ 12",
                "company":null,"evidence":"가상극 25.08 ~ 12"}]}
            """;

    @Test
    void validatesFactsAndCareerAgainstSourceWithoutFillingUnknownValues() {
        PdfApplicantProfile profile = PdfApplicantProfile.parse(MAPPER.readTree(PROFILE));
        profile.validateEvidence("키: 165cm\n가상극 25.08 ~ 12");
        assertEquals("165cm", profile.height().value());
        assertNull(profile.education().value());
        assertNull(profile.careers().get(0).part());
        assertThrows(BusinessException.class, () -> profile.validateEvidence("키: 170cm\n가상극"));
    }

    @Test
    void rejectsFabricatedValueEvenWhenEvidenceExists() {
        ObjectNode node = (ObjectNode) MAPPER.readTree(PROFILE);
        ((ObjectNode) node.path("height")).put("value", "170cm");
        PdfApplicantProfile profile = PdfApplicantProfile.parse(node);
        assertThrows(BusinessException.class, () -> profile.validateEvidence("키: 165cm\n가상극 25.08 ~ 12"));
    }

    @Test
    void storedPayloadRoundTripKeepsProfileAndOmitsNullProfileForLegacyRecords() {
        PdfApplicantProfile profile = PdfApplicantProfile.parse(MAPPER.readTree(PROFILE));
        PdfApplicantInfo original = new PdfApplicantInfo("applicant-info-v2", "COMPLETED", "gemini", "test-model",
                null, null, null, null, "", profile);
        PdfApplicantInfo restored = MAPPER.readValue(MAPPER.writeValueAsString(original), PdfApplicantInfo.class);
        assertEquals(original, restored);
        PdfApplicantInfo legacy = new PdfApplicantInfo("applicant-info-v1", "COMPLETED", "gemini", "test-model",
                null, null, null, null, "");
        assertEquals(false, MAPPER.readTree(MAPPER.writeValueAsString(legacy)).has("profile"));
    }

    @Test
    void acceptsV2ButRejectsProfileInOldOrUnfinishedEnvelope() {
        ObjectNode node = MAPPER.createObjectNode().put("version", "applicant-info-v2")
                .put("status", "COMPLETED").put("provider", "gemini").put("model", "test-model");
        node.set("profile", MAPPER.readTree(PROFILE));
        assertEquals("applicant-info-v2", PdfApplicantInfo.parse(node).version());
        node.put("version", "applicant-info-v1");
        assertThrows(BusinessException.class, () -> PdfApplicantInfo.parse(node));
        node.put("version", "applicant-info-v2").put("status", "FAILED").put("reason", "PROVIDER_ERROR");
        assertThrows(BusinessException.class, () -> PdfApplicantInfo.parse(node));
    }
}
