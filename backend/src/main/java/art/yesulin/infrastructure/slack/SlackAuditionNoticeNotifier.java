package art.yesulin.infrastructure.slack;

import art.yesulin.application.notice.AuditionContent;
import art.yesulin.application.notice.AuditionNoticeNotifier;
import art.yesulin.application.notice.OtrNoticeLink;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

@Component
public class SlackAuditionNoticeNotifier implements AuditionNoticeNotifier {

    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(10);

    private final String webhookUrl;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final OtrNoticeLink noticeLink;

    public SlackAuditionNoticeNotifier(
            @Value("${YESULIN_SLACK_WEBHOOK_URL:}") String webhookUrl,
            ObjectMapper objectMapper,
            OtrNoticeLink noticeLink
    ) {
        this.webhookUrl = webhookUrl;
        this.objectMapper = objectMapper;
        this.noticeLink = noticeLink;
        this.httpClient = HttpClient.newBuilder().connectTimeout(CONNECT_TIMEOUT).build();
    }

    @Override
    public void send(List<AuditionContent> contents) {
        if (contents.isEmpty()) {
            throw new IllegalArgumentException("전송할 공고가 없습니다.");
        }
        StringBuilder message = new StringBuilder("🔔 예술in 오디션 공고 알림 · ").append(contents.size()).append("건\n");
        for (int index = 0; index < contents.size(); index++) {
            AuditionContent content = contents.get(index);
            if (index > 0) {
                message.append("\n\n──────────\n");
            }
            if (!content.category().isBlank()) {
                message.append("\n[").append(content.category()).append("] ");
            }
            message.append(content.title())
                    .append("\n페이: ").append(display(content.pay()))
                    .append(" | 마감: ").append(display(content.deadline()))
                    .append("\n자세히 보기\n").append(noticeLink.create(content.externalId()));
        }
        post(message.toString());
    }

    @Override
    public void sendError(String message) {
        post("공고 수집 오류\n" + message);
    }

    private String display(String value) {
        return value.isBlank() ? "미기재" : value;
    }

    private void post(String message) {
        String body;
        try {
            body = objectMapper.writeValueAsString(Map.of(
                    "text", message,
                    "mrkdwn", false,
                    "unfurl_links", false,
                    "unfurl_media", false
            ));
        } catch (JacksonException exception) {
            throw new IllegalStateException("Slack 알림을 생성하지 못했습니다.");
        }

        HttpRequest request = HttpRequest.newBuilder(webhookUri())
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

    private URI webhookUri() {
        if (webhookUrl == null || webhookUrl.isBlank()) {
            throw new IllegalStateException("YESULIN_SLACK_WEBHOOK_URL이 설정되지 않았습니다.");
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
