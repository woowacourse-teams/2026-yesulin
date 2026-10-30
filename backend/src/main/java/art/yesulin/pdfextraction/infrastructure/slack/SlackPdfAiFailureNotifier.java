package art.yesulin.pdfextraction.infrastructure.slack;

import art.yesulin.infrastructure.slack.SlackEnvironment;
import art.yesulin.infrastructure.slack.SlackWebhookClient;
import art.yesulin.pdfextraction.application.ai.PdfAiFailureNotice;
import art.yesulin.pdfextraction.application.ai.PdfAiFailureNotifier;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
public class SlackPdfAiFailureNotifier implements PdfAiFailureNotifier {

    private final String webhookUrl;
    private final String environment;
    private final String retryBaseUrl;
    private final SlackWebhookClient client;

    public SlackPdfAiFailureNotifier(@Value("${yesulin.slack.pdf-ai-error-webhook-url:}") String webhookUrl,
                                    @Value("${yesulin.slack.pdf-ai-retry-base-url:}") String retryBaseUrl,
                                    Environment environment, SlackWebhookClient client) {
        this.webhookUrl = webhookUrl;
        this.environment = SlackEnvironment.label(environment);
        this.retryBaseUrl = baseUrl(retryBaseUrl, this.environment);
        this.client = client;
    }

    @Override
    public void notifyFailure(PdfAiFailureNotice notice) {
        if (webhookUrl.isBlank()) {
            return;
        }
        String text = "%s 지원자 분석 실패\njobId=%s\nmodel=%s\ncode=%s · attempts=%d".formatted(
                environment, notice.jobId(), notice.model(), notice.errorCode(), notice.attempts());
        List<Map<String, Object>> blocks = new ArrayList<>();
        blocks.add(Map.of("type", "section", "text", Map.of("type", "plain_text", "text", text)));
        if (notice.retryAllowed()) {
            String url = retryBaseUrl + "/pdf-ai/retry?jobId=" + notice.jobId()
                    + "&failedAttempts=" + notice.attempts() + "&failedAt=" + notice.failedAt()
                    + "&generation=" + notice.generation();
            blocks.add(Map.of("type", "actions", "elements", List.of(Map.of(
                    "type", "button", "text", Map.of("type", "plain_text", "text", "AI 재분석 요청"),
                    "action_id", "pdf_ai_retry_link", "url", url))));
        }
        client.post(webhookUrl, Map.of("text", text, "blocks", blocks,
                "unfurl_links", false, "unfurl_media", false));
    }

    private String baseUrl(String configured, String label) {
        String fallback = switch (label) {
            case "[PROD]" -> "https://yesulin.art";
            case "[DEV]" -> "https://dev.yesulin.art";
            default -> "http://localhost:3000";
        };
        String value = configured.isBlank() ? fallback : configured.strip().replaceAll("/+$", "");
        URI uri = URI.create(value);
        boolean local = "[LOCAL]".equals(label) && "http".equals(uri.getScheme())
                && ("localhost".equals(uri.getHost()) || "127.0.0.1".equals(uri.getHost()));
        if ((!"https".equals(uri.getScheme()) && !local) || uri.getHost() == null || uri.getUserInfo() != null
                || uri.getQuery() != null || uri.getFragment() != null
                || !(uri.getPath().isEmpty() || "/".equals(uri.getPath()))) {
            throw new IllegalArgumentException("PDF 재분석 링크는 현재 환경의 프론트 origin이어야 합니다.");
        }
        return value;
    }
}
