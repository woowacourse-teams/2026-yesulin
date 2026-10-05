package art.yesulin.infrastructure.slack;

import art.yesulin.application.notice.AuditionContent;
import art.yesulin.application.notice.AuditionNoticeNotifier;
import art.yesulin.application.notice.OtrNoticeLink;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class SlackAuditionNoticeNotifier implements AuditionNoticeNotifier {

    private final String webhookUrl;
    private final SlackWebhookClient webhookClient;
    private final OtrNoticeLink noticeLink;

    public SlackAuditionNoticeNotifier(
            @Value("${yesulin.slack.notice-webhook-url:}") String webhookUrl,
            SlackWebhookClient webhookClient,
            OtrNoticeLink noticeLink
    ) {
        this.webhookUrl = webhookUrl;
        this.webhookClient = webhookClient;
        this.noticeLink = noticeLink;
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
        if (webhookUrl == null || webhookUrl.isBlank()) {
            throw new IllegalStateException("YESULIN_SLACK_WEBHOOK_URL이 설정되지 않았습니다.");
        }
        webhookClient.post(webhookUrl, message);
    }
}
