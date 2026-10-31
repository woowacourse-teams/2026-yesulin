package art.yesulin.pdfextraction.application.ai;

import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public record PdfAiResilienceProperties(
        @Value("${yesulin.pdf-ai.resilience.circuit-enabled:false}") boolean circuitEnabled,
        @Value("${yesulin.pdf-ai.resilience.escalation-enabled:false}") boolean escalationEnabled,
        @Value("${yesulin.pdf-ai.resilience.escalation-model-id:global.openai.gpt-6-sol}") String escalationModelId,
        @Value("${yesulin.pdf-ai.resilience.escalation-reasoning-effort:low}") String escalationReasoningEffort,
        @Value("${yesulin.pdf-ai.resilience.escalation-max-tokens:8192}") int escalationMaxTokens,
        @Value("${yesulin.pdf-ai.resilience.failure-threshold:3}") int failureThreshold,
        @Value("${yesulin.pdf-ai.resilience.open-duration:PT60S}") Duration openDuration,
        @Value("${yesulin.pdf-ai.resilience.max-open-duration:PT5M}") Duration maxOpenDuration
) {

    public PdfAiResilienceProperties {
        if (failureThreshold < 1 || failureThreshold > 50 || openDuration.compareTo(Duration.ofSeconds(1)) < 0
                || maxOpenDuration.compareTo(openDuration) < 0
                || maxOpenDuration.compareTo(Duration.ofHours(1)) > 0
                || escalationModelId.isBlank() || escalationModelId.length() > 150
                || escalationEnabled && !escalationModelId.contains("openai.gpt-6-sol")
                || !java.util.Set.of("none", "low", "medium", "high", "xhigh", "max")
                        .contains(escalationReasoningEffort)
                || escalationMaxTokens < 4096 || escalationMaxTokens > 32768) {
            throw new IllegalArgumentException("Invalid PDF AI resilience settings");
        }
    }
}
