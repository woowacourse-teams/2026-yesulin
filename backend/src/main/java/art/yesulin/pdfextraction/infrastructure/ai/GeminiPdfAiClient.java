package art.yesulin.pdfextraction.infrastructure.ai;

import art.yesulin.pdfextraction.application.ai.PdfAiClient;
import art.yesulin.pdfextraction.application.ai.PdfAiFailure;
import art.yesulin.pdfextraction.application.ai.PdfAiProperties;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** 로컬 검증 전용. 기본 Bedrock 경로는 이 클라이언트로 대체되지 않는다. */
@Component
@Profile("local")
@ConditionalOnExpression("${yesulin.pdf-ai.enabled:false} and '${yesulin.pdf-ai.provider:bedrock}' == 'gemini'")
public class GeminiPdfAiClient implements PdfAiClient {

    private static final String ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent";
    private static final Pattern MODEL_ID = Pattern.compile("[A-Za-z0-9._-]{1,100}");
    private static final Duration TIMEOUT = Duration.ofSeconds(30);
    private static final int MAX_BODY_BYTES = 128 * 1024;
    private static final int MAX_OUTPUT_TOKENS = 6000;
    private static final int REQUEST_TIMEOUT_STATUS = 408;
    private static final int TOO_MANY_REQUESTS_STATUS = 429;
    private static final int SERVER_ERROR_STATUS = 500;
    private static final String PROVIDER_ERROR = "PROVIDER_ERROR";
    private static final String INVALID_MODEL_OUTPUT = "INVALID_MODEL_OUTPUT";

    private final URI endpoint;
    private final String apiKey;
    private final ObjectMapper mapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(TIMEOUT)
            .followRedirects(HttpClient.Redirect.NEVER)
            .build();

    public GeminiPdfAiClient(
            PdfAiProperties properties,
            ObjectMapper mapper,
            @Value("${yesulin.pdf-ai.gemini-api-key:}") String apiKey,
            @Value("${yesulin.pdf-ai.gemini-api-key-file:}") String apiKeyFile
    ) {
        if (!MODEL_ID.matcher(properties.modelId()).matches()) {
            throw new IllegalStateException("Invalid Gemini model ID");
        }
        this.endpoint = URI.create(ENDPOINT.formatted(properties.modelId()));
        this.apiKey = resolveApiKey(apiKey, apiKeyFile);
        this.mapper = mapper;
    }

    @Override
    public String generate(String systemPrompt, String userPrompt) {
        HttpRequest request = HttpRequest.newBuilder(endpoint)
                .timeout(TIMEOUT)
                .header("Content-Type", "application/json")
                .header("x-goog-api-key", apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(body(systemPrompt, userPrompt)))
                .build();
        return text(send(request));
    }

    private String body(String systemPrompt, String userPrompt) {
        return mapper.writeValueAsString(Map.of(
                "systemInstruction", Map.of("parts", List.of(Map.of("text", systemPrompt))),
                "contents", List.of(Map.of("role", "user", "parts", List.of(Map.of("text", userPrompt)))),
                "generationConfig", Map.of(
                        "temperature", 0,
                        "maxOutputTokens", MAX_OUTPUT_TOKENS,
                        "responseMimeType", "application/json")));
    }

    private byte[] send(HttpRequest request) {
        try {
            HttpResponse<byte[]> response = httpClient.send(request,
                    HttpResponse.BodyHandlers.limiting(HttpResponse.BodyHandlers.ofByteArray(), MAX_BODY_BYTES));
            int status = response.statusCode();
            if (status != 200) {
                throw new PdfAiFailure("GEMINI_HTTP_" + status, retryable(status));
            }
            return response.body();
        } catch (IOException exception) {
            throw new PdfAiFailure(PROVIDER_ERROR, true);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new PdfAiFailure(PROVIDER_ERROR, true);
        }
    }

    private String text(byte[] body) {
        JsonNode candidate;
        try {
            candidate = mapper.readTree(body).path("candidates").path(0);
        } catch (JacksonException exception) {
            throw new PdfAiFailure(INVALID_MODEL_OUTPUT, false);
        }
        if (!"STOP".equals(candidate.path("finishReason").asText())) {
            throw new PdfAiFailure(INVALID_MODEL_OUTPUT, false);
        }
        StringBuilder text = new StringBuilder();
        candidate.path("content").path("parts").forEach(part -> text.append(part.path("text").asText("")));
        if (text.toString().isBlank()) {
            throw new PdfAiFailure(INVALID_MODEL_OUTPUT, false);
        }
        return text.toString();
    }

    private boolean retryable(int status) {
        return status == REQUEST_TIMEOUT_STATUS || status == TOO_MANY_REQUESTS_STATUS
                || status >= SERVER_ERROR_STATUS;
    }

    private static String resolveApiKey(String apiKey, String apiKeyFile) {
        String key = apiKey;
        if (key.isBlank() && !apiKeyFile.isBlank()) {
            try {
                key = Files.readString(Path.of(apiKeyFile), StandardCharsets.UTF_8);
            } catch (IOException exception) {
                throw new IllegalStateException("Gemini API key file cannot be read");
            }
        }
        if (key.isBlank()) {
            throw new IllegalStateException("Gemini API key is required");
        }
        return key.strip();
    }
}
