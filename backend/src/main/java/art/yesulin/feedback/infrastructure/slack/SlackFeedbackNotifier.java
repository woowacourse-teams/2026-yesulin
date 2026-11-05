package art.yesulin.feedback.infrastructure.slack;

import art.yesulin.feedback.application.FeedbackNotifier;
import art.yesulin.feedback.application.FeedbackSubmittedEvent;
import art.yesulin.infrastructure.slack.SlackEnvironment;
import art.yesulin.infrastructure.slack.SlackWebhookClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/** 저장된 의견을 전용 채널로 비동기 전송한다. 웹훅이 없으면 로그만 남긴다. 연락처 원문은 보내지 않는다. */
@Component
public class SlackFeedbackNotifier implements FeedbackNotifier {

    private static final Logger LOGGER = LoggerFactory.getLogger(SlackFeedbackNotifier.class);
    private static final int PREVIEW_MAX = 500;

    private final String webhookUrl;
    private final String siteBaseUrl;
    private final String prefix;
    private final SlackWebhookClient webhookClient;

    public SlackFeedbackNotifier(
            @Value("${yesulin.slack.feedback-webhook-url:}") String webhookUrl,
            @Value("${yesulin.notice.link-base-url}") String siteBaseUrl,
            SlackWebhookClient webhookClient,
            Environment environment
    ) {
        this.webhookUrl = webhookUrl;
        this.siteBaseUrl = siteBaseUrl.strip().replaceAll("/+$", "");
        this.webhookClient = webhookClient;
        this.prefix = SlackEnvironment.nonProductionPrefix(environment);
    }

    @Override
    public void notifySubmitted(FeedbackSubmittedEvent event) {
        LOGGER.atInfo().addKeyValue("event", "FEEDBACK_SUBMITTED").addKeyValue("feedbackId", event.feedbackId())
                .log("의견 접수 feedbackId={} type={}", event.feedbackId(), event.type());
        if (webhookUrl == null || webhookUrl.isBlank()) {
            return;
        }
        String message = message(event);
        Thread.ofVirtual().name("feedback-slack").start(() -> send(event, message));
    }

    private void send(FeedbackSubmittedEvent event, String message) {
        try {
            webhookClient.post(webhookUrl, message);
        } catch (RuntimeException exception) {
            LOGGER.atWarn().addKeyValue("event", "FEEDBACK_SLACK_FAILED").addKeyValue("feedbackId", event.feedbackId())
                    .log("의견 Slack 알림 실패 feedbackId={} reason={}", event.feedbackId(),
                            exception.getClass().getSimpleName());
        }
    }

    private String message(FeedbackSubmittedEvent event) {
        return prefix + "[의견 보내기] " + event.type().label() + " #" + event.feedbackId() + '\n'
                + "보낸 사람: " + event.writer().label() + " · 연락처 " + contactLabel(event) + '\n'
                + "화면: " + page(event) + '\n'
                + "────\n" + preview(event.content());
    }

    private String contactLabel(FeedbackSubmittedEvent event) {
        if (event.contactLeft()) {
            return "남김(DB에서 확인)";
        }
        return "없음";
    }

    private String page(FeedbackSubmittedEvent event) {
        if (event.pagePath().isEmpty()) {
            return "알 수 없음";
        }
        return siteBaseUrl + escape(event.pagePath());
    }

    private static String preview(String content) {
        if (content.length() <= PREVIEW_MAX) {
            return escape(content);
        }
        return escape(content.substring(0, PREVIEW_MAX)) + "…";
    }

    private static String escape(String text) {
        return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
