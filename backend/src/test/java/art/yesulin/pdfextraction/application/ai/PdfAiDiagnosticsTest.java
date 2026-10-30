package art.yesulin.pdfextraction.application.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.mock.env.MockEnvironment;

class PdfAiDiagnosticsTest {

    private final Logger logger = (Logger) LoggerFactory.getLogger(PdfAiDiagnostics.class);
    private final ListAppender<ILoggingEvent> appender = new ListAppender<>();
    private Level original;

    @BeforeEach
    void capture() {
        original = logger.getLevel();
        appender.start();
        logger.addAppender(appender);
        logger.setLevel(Level.DEBUG);
    }

    @AfterEach
    void restore() {
        logger.detachAppender(appender);
        logger.setLevel(original);
        appender.stop();
        MDC.remove("pdfAiJobId");
    }

    @Test
    void devRecordsResponseAndProviderMetadataBeforeRejectedResponse() {
        PdfAiDiagnostics diagnostics = diagnostics("dev");
        PdfAiFailure failure = assertThrows(PdfAiFailure.class, () -> diagnostics.withJob("synthetic-job", () -> {
            diagnostics.providerResponse("max_tokens", 100, 4096, "{\"synthetic\":");
            throw new PdfAiFailure("INVALID_MODEL_OUTPUT", false, "PROVIDER_STOP_OR_MISSING_MESSAGE");
        }));
        diagnostics.failed("synthetic-job", failure.reason());

        assertEquals(2, appender.list.size());
        ILoggingEvent response = appender.list.get(0);
        assertTrue(response.getFormattedMessage().contains("AI_PROVIDER_RESPONSE jobId=synthetic-job"));
        assertEquals("{\"synthetic\":", value(response, "aiResponse"));
        assertEquals("max_tokens", value(response, "stopReason"));
        assertEquals(4096, value(response, "outputTokens"));
        assertEquals(false, value(response, "responseTruncated"));
        assertTrue(appender.list.get(1).getFormattedMessage().contains("reason=PROVIDER_STOP_OR_MISSING_MESSAGE"));
        assertNull(MDC.get("pdfAiJobId"));
    }

    @Test
    void prodAndOtherProfilesNeverRecordResponseEvenAtDebug() {
        for (String[] profiles : new String[][]{{"prod"}, {"dev", "prod"}, {"local"}, {}}) {
            PdfAiDiagnostics diagnostics = diagnostics(profiles);
            assertEquals("ok", diagnostics.withJob("job", () -> {
                diagnostics.providerResponse("end_turn", 1, 2, "SYNTHETIC_PRIVATE_RESPONSE");
                diagnostics.failed("job", "JSON_SYNTAX");
                return "ok";
            }));
        }
        assertTrue(appender.list.isEmpty());
    }

    @Test
    void infoLevelDoesNotRecordRawResponseAndNestedContextIsRestored() {
        PdfAiDiagnostics diagnostics = diagnostics("dev");
        logger.setLevel(Level.INFO);
        MDC.put("pdfAiJobId", "previous-job");
        diagnostics.withJob("current-job", () -> {
            assertEquals("current-job", MDC.get("pdfAiJobId"));
            diagnostics.providerResponse("end_turn", 1, 2, "SYNTHETIC_PRIVATE_RESPONSE");
            return "ok";
        });
        assertEquals("previous-job", MDC.get("pdfAiJobId"));
        assertTrue(appender.list.isEmpty());
    }

    @Test
    void oversizedResponseHasAnExplicitBoundAndTruncationMarker() {
        PdfAiDiagnostics diagnostics = diagnostics("dev");
        String response = "x".repeat(128 * 1024 + 1);
        diagnostics.withJob("bounded-job", () -> {
            diagnostics.providerResponse("max_tokens", null, null, response);
            return "ok";
        });
        ILoggingEvent event = appender.list.getFirst();
        assertEquals(128 * 1024, ((String) value(event, "aiResponse")).length());
        assertEquals(response.length(), value(event, "responseCharacters"));
        assertTrue((Boolean) value(event, "responseTruncated"));
        assertFalse(event.getFormattedMessage().contains(response));
    }

    private PdfAiDiagnostics diagnostics(String... profiles) {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles(profiles);
        return new PdfAiDiagnostics(environment);
    }

    private Object value(ILoggingEvent event, String key) {
        return event.getKeyValuePairs().stream().filter(pair -> pair.key.equals(key)).findFirst().orElseThrow().value;
    }
}
