package art.yesulin.auditionpost.infrastructure.slack;

import art.yesulin.auditionpost.application.notice.AuditionAlert;
import art.yesulin.auditionpost.application.notice.AuditionContent;
import art.yesulin.auditionpost.application.notice.AuditionNoticeNotifier;
import art.yesulin.infrastructure.slack.SlackEnvironment;
import art.yesulin.infrastructure.slack.SlackWebhookClient;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
public class SlackAuditionNoticeNotifier implements AuditionNoticeNotifier {

    private final String webhookUrl;
    private final String errorWebhookUrl;
    private final SlackWebhookClient webhookClient;
    private final String environmentLabel;

    public SlackAuditionNoticeNotifier(
            @Value("${yesulin.slack.notice-webhook-url:}") String webhookUrl,
            @Value("${yesulin.slack.error-webhook-url:}") String errorWebhookUrl,
            SlackWebhookClient webhookClient,
            Environment environment
    ) {
        this.webhookUrl = webhookUrl;
        this.errorWebhookUrl = errorWebhookUrl;
        this.webhookClient = webhookClient;
        this.environmentLabel = SlackEnvironment.label(environment);
    }

    @Override
    public void sendAlerts(List<AuditionAlert> alerts) {
        if (alerts.isEmpty()) {
            throw new IllegalArgumentException("전송할 공고가 없습니다.");
        }
        StringBuilder message = SlackAuditionMessages.header(alerts.size());
        for (int index = 0; index < alerts.size(); index++) {
            AuditionContent content = alerts.get(index).content();
            if (index > 0) {
                message.append("\n\n──────────\n");
            }
            SlackAuditionMessages.appendAlert(message, content.category(), content.title(), content.pay(),
                    content.deadline(), alerts.get(index).link());
        }
        post(message.toString());
    }

    @Override
    public void sendError(String message) {
        post("공고 수집 오류\n" + message);
    }

    @Override
    public void sendDeliveryFailure(String message) {
        if (errorWebhookUrl == null || errorWebhookUrl.isBlank()) {
            return;
        }
        webhookClient.post(errorWebhookUrl, "⚠️ %s 공고 알림 전송 실패\n%s".formatted(environmentLabel, message));
    }

    private void post(String message) {
        if (webhookUrl == null || webhookUrl.isBlank()) {
            throw new IllegalStateException("YESULIN_SLACK_WEBHOOK_URL이 설정되지 않았습니다.");
        }
        webhookClient.post(webhookUrl, message);
    }
}
