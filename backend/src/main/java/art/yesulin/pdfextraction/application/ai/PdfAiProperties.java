package art.yesulin.pdfextraction.application.ai;

import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public record PdfAiProperties(
        @Value("${yesulin.pdf-ai.enabled:false}") boolean enabled,
        @Value("${yesulin.pdf-ai.provider:bedrock}") String provider,
        @Value("${yesulin.pdf-ai.model-id:global.anthropic.claude-haiku-5-5}") String modelId,
        @Value("${yesulin.pdf-ai.region:ap-northeast-2}") String region,
        @Value("${yesulin.pdf-ai.concurrency:4}") int concurrency,
        @Value("${yesulin.pdf-ai.max-attempts:3}") int maxAttempts,
        @Value("${yesulin.pdf-ai.lease-duration:PT2M}") Duration leaseDuration,
        @Value("${yesulin.pdf-ai.request-interval:PT0.2S}") Duration requestInterval
) {

    public static final String PROMPT_VERSION = "applicant-info-spring-v1";
    public static final int MAX_TEXT_LENGTH = 32_000;

    public PdfAiProperties {
        if (concurrency < 1 || concurrency > 50 || maxAttempts < 1 || maxAttempts > 5
                || requestInterval.isNegative()
                || leaseDuration.compareTo(Duration.ofMinutes(2)) < 0
                || leaseDuration.compareTo(Duration.ofMinutes(10)) > 0) {
            throw new IllegalArgumentException("Invalid PDF AI worker limits");
        }
        if (enabled && (modelId.isBlank() || !(provider.equals("bedrock") || provider.equals("gemini")))) {
            throw new IllegalArgumentException("PDF AI provider and model ID are required when enabled");
        }
    }
}
