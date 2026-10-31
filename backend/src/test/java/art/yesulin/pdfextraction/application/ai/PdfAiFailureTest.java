package art.yesulin.pdfextraction.application.ai;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class PdfAiFailureTest {

    @Test
    void onlySchemaAndEvidenceRejectionsQualifyForModelEscalation() {
        for (String reason : List.of("JSON_SYNTAX", "APPLICANT_NAME_EVIDENCE_MISMATCH",
                "PROFILE_EVIDENCE_MISMATCH", "INVALID_FIELD_TYPE:age")) {
            assertTrue(new PdfAiFailure("INVALID_MODEL_OUTPUT", false, reason).qualityRejected());
        }
        for (String reason : List.of("PROVIDER_STOP_OR_MISSING_MESSAGE", "EMPTY_PROVIDER_RESPONSE",
                "MISSING_RESPONSE", "RESPONSE_TOO_LARGE", "UNKNOWN_FUTURE_REASON")) {
            assertFalse(new PdfAiFailure("INVALID_MODEL_OUTPUT", false, reason).qualityRejected());
        }
        assertFalse(new PdfAiFailure("RATE_LIMITED", true).qualityRejected());
        assertFalse(new PdfAiFailure("INVALID_SOURCE", false).qualityRejected());
    }

    @Test
    void allowedUnknownValuesPassWithoutEscalation() {
        PdfAiResponseParser parser = new PdfAiResponseParser(JsonMapper.builder().build());
        assertTrue(parser.parse("{\"applicantName\":null,\"applicantNameEvidence\":null,"
                        + "\"roleId\":null,\"roleEvidence\":null,\"profile\":null}",
                "source", List.of(), "bedrock", "model").completed());
    }
}
