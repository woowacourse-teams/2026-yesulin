package art.yesulin.community.infrastructure;

import art.yesulin.community.application.CommunityReportNotice;
import art.yesulin.community.application.CommunityReportNotifier;
import art.yesulin.infrastructure.slack.SlackWebhookClient;
import java.net.URI;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
public class SlackCommunityReportNotifier implements CommunityReportNotifier {

    private final SlackWebhookClient client;
    private final String webhook;
    private final String baseUrl;
    private final String environment;

    public SlackCommunityReportNotifier(SlackWebhookClient client, Environment environment,
            @Value("${yesulin.slack.community-webhook-url:}") String webhook,
            @Value("${yesulin.community.link-base-url:}") String baseUrl) {
        this.client = client;
        this.webhook = webhook;
        this.baseUrl = baseUrl.replaceAll("/+$", "");
        this.environment = String.join(",", environment.getActiveProfiles());
        validateBaseUrl();
    }

    private void validateBaseUrl() {
        if (webhook.isBlank()) {
            return;
        }
        URI uri = URI.create(baseUrl);
        if (uri.getHost() == null || !("https".equals(uri.getScheme()) || "http".equals(uri.getScheme()))) {
            throw new IllegalStateException("커뮤니티 알림을 사용하려면 같은 환경의 커뮤니티 링크 주소를 설정해야 합니다.");
        }
    }

    @Override
    public boolean enabled() {
        return !webhook.isBlank();
    }

    @Override
    public void send(CommunityReportNotice notice) {
        String text = "[%s] 커뮤니티 최초 신고 #%d\n대상: %s #%d\n사유: %s\n접수: %s\n%s".formatted(
                environment, notice.reportId(), targetType(notice), notice.entryId(), notice.reason(),
                notice.createdAt(), link(notice));
        client.post(webhook, text);
    }

    private String targetType(CommunityReportNotice notice) {
        if (notice.entryId() == notice.postId()) {
            return "글";
        }
        return "댓글";
    }

    private String link(CommunityReportNotice notice) {
        String link = baseUrl + "/community/" + notice.postId();
        if (notice.entryId() != notice.postId()) {
            return link + "#comment-" + notice.entryId();
        }
        return link;
    }
}
