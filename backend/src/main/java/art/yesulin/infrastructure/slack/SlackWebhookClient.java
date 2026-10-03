package art.yesulin.infrastructure.slack;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

/**
 * Slack Incoming Webhook으로 일반 텍스트 메시지를 보낸다. 링크 미리보기는 끈다.
 * 성공 응답(HTTP 200, 본문 ok)을 확인한 뒤 반환하며 실패하거나 결과가 불명확하면 예외를 던진다.
 */
@Component
public class SlackWebhookClient {

    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(10);

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    @Autowired
    public SlackWebhookClient(ObjectMapper objectMapper) {
        this(objectMapper, HttpClient.newBuilder().connectTimeout(CONNECT_TIMEOUT).build());
    }

    SlackWebhookClient(ObjectMapper objectMapper, HttpClient httpClient) {
        this.objectMapper = objectMapper;
        this.httpClient = httpClient;
    }

    public void post(String webhookUrl, String text) {
        String body;
        try {
            body = objectMapper.writeValueAsString(Map.of(
                    "text", text,
                    "mrkdwn", false,
                    "unfurl_links", false,
                    "unfurl_media", false
            ));
        } catch (JacksonException exception) {
            throw new IllegalStateException("Slack 알림을 생성하지 못했습니다.");
        }

        HttpRequest request = HttpRequest.newBuilder(webhookUri(webhookUrl))
                .timeout(REQUEST_TIMEOUT)
                .header("Content-Type", "application/json; charset=utf-8")
                .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                .build();
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200 || !"ok".equals(response.body().trim())) {
                throw new IllegalStateException("Slack 알림 전송에 실패했습니다. HTTP " + response.statusCode());
            }
        } catch (IOException exception) {
            throw new IllegalStateException("Slack 알림 서버에 연결하지 못했습니다.");
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Slack 알림 전송이 중단됐습니다.");
        }
    }

    private URI webhookUri(String webhookUrl) {
        if (webhookUrl == null || webhookUrl.isBlank()) {
            throw new IllegalStateException("Slack Webhook URL이 설정되지 않았습니다.");
        }
        try {
            URI uri = URI.create(webhookUrl);
            if (!"https".equals(uri.getScheme())
                    || !("hooks.slack.com".equals(uri.getHost())
                    || "hooks.slack-gov.com".equals(uri.getHost()))
                    || uri.getPath() == null || !uri.getPath().startsWith("/services/")) {
                throw new IllegalArgumentException("Slack Webhook URL 형식이 올바르지 않습니다.");
            }
            return uri;
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException("Slack Webhook URL 형식이 올바르지 않습니다.");
        }
    }
}
