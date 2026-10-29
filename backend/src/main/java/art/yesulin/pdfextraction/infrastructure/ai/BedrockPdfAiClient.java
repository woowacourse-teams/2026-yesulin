package art.yesulin.pdfextraction.infrastructure.ai;

import art.yesulin.pdfextraction.application.ai.PdfAiClient;
import art.yesulin.pdfextraction.application.ai.PdfAiFailure;
import art.yesulin.pdfextraction.application.ai.PdfAiProperties;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
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

    @Override
    public String generate(String systemPrompt, String userPrompt) {
        ConverseRequest request = ConverseRequest.builder()
                .modelId(properties.modelId())
                .system(SystemContentBlock.builder().text(systemPrompt).build())
                .messages(Message.builder()
                        .role(ConversationRole.USER)
                        .content(ContentBlock.fromText(userPrompt))
                        .build())
                .inferenceConfig(InferenceConfiguration.builder()
                        .maxTokens(MAX_TOKENS)
                        .build())
                .build();
        return text(converse(request));
    }

    private ConverseResponse converse(ConverseRequest request) {
        try {
            return client.converse(request);
        } catch (BedrockRuntimeException exception) {
            throw new PdfAiFailure(PROVIDER_ERROR, retryable(exception));
        } catch (SdkClientException exception) {
            throw new PdfAiFailure(PROVIDER_ERROR, retryable(exception));
        }
    }

    private String text(ConverseResponse response) {
        if (response.stopReason() != StopReason.END_TURN || response.output() == null
                || response.output().message() == null) {
            throw new PdfAiFailure(INVALID_MODEL_OUTPUT, false);
        }
        String text = response.output().message().content().stream()
                .map(ContentBlock::text)
                .filter(value -> value != null)
                .collect(Collectors.joining());
        if (text.isBlank()) {
            throw new PdfAiFailure(INVALID_MODEL_OUTPUT, false);
        }
        return text;
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
