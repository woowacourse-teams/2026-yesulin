package art.yesulin.pdfextraction.application.ai;

import java.util.Arrays;
import java.util.function.Supplier;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class PdfAiDiagnostics {

    private static final String JOB_ID_KEY = "pdfAiJobId";
    private static final int MAX_RESPONSE_CHARACTERS = 128 * 1024;

    private final boolean enabled;

    public PdfAiDiagnostics(Environment environment) {
        var profiles = Arrays.asList(environment.getActiveProfiles());
        this.enabled = profiles.contains("dev") && !profiles.contains("prod");
    }

    public String withJob(String jobId, Supplier<String> request) {
        if (!enabled) {
            return request.get();
        }
        String previous = MDC.get(JOB_ID_KEY);
        MDC.put(JOB_ID_KEY, jobId);
        try {
            return request.get();
        } finally {
            if (previous == null) {
                MDC.remove(JOB_ID_KEY);
            } else {
                MDC.put(JOB_ID_KEY, previous);
            }
        }
    }

    public void providerResponse(String stopReason, Integer inputTokens, Integer outputTokens, String response) {
        if (!enabled || !log.isDebugEnabled()) {
            return;
        }
        String body = response == null ? "" : response;
        boolean truncated = body.length() > MAX_RESPONSE_CHARACTERS;
        String recorded = truncated ? body.substring(0, MAX_RESPONSE_CHARACTERS) : body;
        log.atDebug()
                .addKeyValue("stopReason", stopReason)
                .addKeyValue("inputTokens", inputTokens)
                .addKeyValue("outputTokens", outputTokens)
                .addKeyValue("responseCharacters", body.length())
                .addKeyValue("responseTruncated", truncated)
                .addKeyValue("aiResponse", recorded)
                .log("PDF_FLOW stage=AI_PROVIDER_RESPONSE jobId={}", MDC.get(JOB_ID_KEY));
    }

    public void failed(String jobId, String reason) {
        if (enabled) {
            log.debug("PDF_FLOW stage=AI_FAILURE_DETAIL jobId={} reason={}", jobId, reason);
        }
    }
}
