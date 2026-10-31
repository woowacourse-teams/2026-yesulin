package art.yesulin.pdfextraction.infrastructure.ai;

import art.yesulin.pdfextraction.application.ai.PdfAiClient;
import art.yesulin.pdfextraction.application.ai.PdfAiDiagnostics;
import art.yesulin.pdfextraction.application.ai.PdfAiFailure;
import art.yesulin.pdfextraction.application.ai.PdfAiProperties;
import art.yesulin.pdfextraction.application.ai.PdfAiResilienceProperties;
import art.yesulin.pdfextraction.application.ai.PdfAiWork;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.core.document.Document;
import software.amazon.awssdk.core.exception.SdkClientException;
import software.amazon.awssdk.services.bedrockruntime.BedrockRuntimeClient;
import software.amazon.awssdk.services.bedrockruntime.model.BedrockRuntimeException;
import software.amazon.awssdk.services.bedrockruntime.model.ContentBlock;
import software.amazon.awssdk.services.bedrockruntime.model.ConversationRole;
import software.amazon.awssdk.services.bedrockruntime.model.ConverseRequest;
import software.amazon.awssdk.services.bedrockruntime.model.ConverseResponse;
import software.amazon.awssdk.services.bedrockruntime.model.InferenceConfiguration;
import software.amazon.awssdk.services.bedrockruntime.model.Message;
import software.amazon.awssdk.services.bedrockruntime.model.ModelErrorException;
import software.amazon.awssdk.services.bedrockruntime.model.ModelNotReadyException;
import software.amazon.awssdk.services.bedrockruntime.model.ModelTimeoutException;
import software.amazon.awssdk.services.bedrockruntime.model.StopReason;
import software.amazon.awssdk.services.bedrockruntime.model.SystemContentBlock;

@Component
@RequiredArgsConstructor
@Slf4j
@Profile("dev | prod")
@ConditionalOnExpression("${yesulin.pdf-ai.enabled:false} and '${yesulin.pdf-ai.provider:bedrock}' == 'bedrock'")
public class BedrockPdfAiClient implements PdfAiClient {

    private static final int MAX_TOKENS = 4096;
    private static final String PROVIDER_ERROR = "PROVIDER_ERROR";
    private static final String INVALID_MODEL_OUTPUT = "INVALID_MODEL_OUTPUT";
    private static final int REQUEST_TIMEOUT_STATUS = 408;
    private static final int TOO_MANY_REQUESTS_STATUS = 429;
    private static final int SERVER_ERROR_STATUS = 500;

    private final BedrockRuntimeClient client;
    private final PdfAiProperties properties;
    private final PdfAiDiagnostics diagnostics;
    private final PdfAiResilienceProperties resilience;

    @Override
    public String generate(String systemPrompt, String userPrompt) {
        return generate(properties.modelId(), properties.reasoningEffort(), MAX_TOKENS, systemPrompt, userPrompt, null);
    }

    @Override
    public String generate(PdfAiWork work, String systemPrompt, String userPrompt) {
        return generate(work.modelId(), work.escalated() ? resilience.escalationReasoningEffort()
                        : properties.reasoningEffort(),
                work.escalated() ? resilience.escalationMaxTokens() : MAX_TOKENS,
                systemPrompt, userPrompt, work);
    }

    private String generate(String modelId, String effort, int maxTokens, String systemPrompt, String userPrompt,
                            PdfAiWork work) {
        ConverseRequest.Builder request = ConverseRequest.builder()
                .modelId(modelId)
                .system(SystemContentBlock.builder().text(systemPrompt).build())
                .messages(Message.builder()
                        .role(ConversationRole.USER)
                        .content(ContentBlock.fromText(userPrompt))
                        .build())
                .inferenceConfig(InferenceConfiguration.builder()
                        .maxTokens(maxTokens)
                        .build());
        if (modelId.contains("openai.gpt-6-luna") || modelId.contains("openai.gpt-6-sol")) {
            request.additionalModelRequestFields(Document.fromMap(Map.of("reasoning",
                    Document.fromMap(Map.of("effort", Document.fromString(effort))))));
        } else if (modelId.contains("anthropic.claude-haiku-5-5")) {
            boolean disabled = "none".equals(effort);
            request.additionalModelRequestFields(Document.fromMap(Map.of(
                    "thinking", Document.fromMap(Map.of("type",
                            Document.fromString(disabled ? "disabled" : "adaptive"))),
                    "output_config", Document.fromMap(Map.of("effort",
                            Document.fromString(disabled ? "medium" : effort))))));
        }
        ConverseResponse response = converse(request.build());
        if (response.usage() != null) {
            log.atInfo().addKeyValue("event", "PDF_AI_RESILIENCE").addKeyValue("kind", "TOKEN_USAGE")
                    .addKeyValue("jobId", work == null ? null : work.jobId())
                    .addKeyValue("generation", work == null ? null : work.retryGeneration())
                    .addKeyValue("modelId", modelId).addKeyValue("inputTokens", response.usage().inputTokens())
                    .addKeyValue("cacheReadInputTokens", response.usage().cacheReadInputTokens())
                    .addKeyValue("cacheWriteInputTokens", response.usage().cacheWriteInputTokens())
                    .addKeyValue("outputTokens", response.usage().outputTokens())
                    .addKeyValue("totalTokens", response.usage().totalTokens()).log("PDF_AI_RESILIENCE");
        }
        return text(response);
    }

    private ConverseResponse converse(ConverseRequest request) {
        try {
            return client.converse(request);
        } catch (BedrockRuntimeException exception) {
            if (rateLimited(exception)) {
                throw new PdfAiFailure("RATE_LIMITED", true, "PROVIDER_RATE_LIMITED");
            }
            throw new PdfAiFailure(PROVIDER_ERROR, retryable(exception));
        } catch (SdkClientException exception) {
            throw new PdfAiFailure(PROVIDER_ERROR, retryable(exception));
        }
    }

    private boolean rateLimited(BedrockRuntimeException exception) {
        // ModelNotReady may also use HTTP 429; it is not a quota rejection.
        if (exception instanceof ModelNotReadyException) {
            return false;
        }
        return exception.statusCode() == TOO_MANY_REQUESTS_STATUS
                || exception.awsErrorDetails() != null
                && "ThrottlingException".equals(exception.awsErrorDetails().errorCode())
                || exception instanceof ModelErrorException modelError
                && modelError.originalStatusCode() != null
                && modelError.originalStatusCode() == TOO_MANY_REQUESTS_STATUS;
    }

    private String text(ConverseResponse response) {
        String text = responseText(response);
        diagnostics.providerResponse(response.stopReasonAsString(),
                response.usage() == null ? null : response.usage().inputTokens(),
                response.usage() == null ? null : response.usage().outputTokens(), text);
        if (response.stopReason() != StopReason.END_TURN || response.output() == null
                || response.output().message() == null) {
            throw new PdfAiFailure(INVALID_MODEL_OUTPUT, false, "PROVIDER_STOP_OR_MISSING_MESSAGE");
        }
        if (text.isBlank()) {
            throw new PdfAiFailure(INVALID_MODEL_OUTPUT, false, "EMPTY_PROVIDER_RESPONSE");
        }
        return text;
    }

    private String responseText(ConverseResponse response) {
        if (response.output() == null || response.output().message() == null) {
            return "";
        }
        return response.output().message().content().stream()
                .map(ContentBlock::text)
                .filter(value -> value != null)
                .collect(Collectors.joining());
    }

    private boolean retryable(BedrockRuntimeException exception) {
        int status = exception.statusCode();
        if (exception instanceof ModelErrorException modelError && modelError.originalStatusCode() != null) {
            return modelError.originalStatusCode() == TOO_MANY_REQUESTS_STATUS
                    || modelError.originalStatusCode() >= SERVER_ERROR_STATUS;
        }
        return exception instanceof ModelTimeoutException || exception instanceof ModelNotReadyException
                || status == REQUEST_TIMEOUT_STATUS || status == TOO_MANY_REQUESTS_STATUS
                || status >= SERVER_ERROR_STATUS;
    }

    private boolean retryable(SdkClientException exception) {
        String message = exception.getMessage();
        return message == null || !message.contains("Unable to load");
    }
}
