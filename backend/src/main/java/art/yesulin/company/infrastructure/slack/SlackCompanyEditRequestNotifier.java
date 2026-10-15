package art.yesulin.company.infrastructure.slack;

import art.yesulin.company.application.editrequest.CompanyEditRequestNotifier;
import art.yesulin.company.application.editrequest.CompanyEditRequestedEvent;
import art.yesulin.infrastructure.slack.SlackEnvironment;
import art.yesulin.infrastructure.slack.SlackWebhookClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * 새 공연사 정보 수정 요청을 공고 알림 채널로 보낸다. 요청자 연락처는 보내지 않고, 사유는 앞부분만 보낸다.
 * 웹훅이 없으면 로그만 남기고, 요청자의 응답이 Slack을 기다리지 않도록 별도 가상 스레드에서 보낸다.
 */
@Component
public class SlackCompanyEditRequestNotifier implements CompanyEditRequestNotifier {

    static final String REQUESTED_EVENT = "COMPANY_EDIT_REQUESTED";

    private static final Logger LOGGER = LoggerFactory.getLogger(SlackCompanyEditRequestNotifier.class);
    private static final int REASON_PREVIEW_LENGTH = 200;
    private static final String ADMIN_PATH = "/admin/posts?view=edit-requests";

    private final String webhookUrl;
    private final SlackWebhookClient webhookClient;
    private final String adminLink;
    private final String prefix;

    public SlackCompanyEditRequestNotifier(
            @Value("${yesulin.slack.notice-webhook-url:}") String webhookUrl,
            @Value("${yesulin.notice.link-base-url}") String linkBaseUrl,
            SlackWebhookClient webhookClient,
            Environment environment
    ) {
        this.webhookUrl = webhookUrl;
        this.webhookClient = webhookClient;
        this.adminLink = linkBaseUrl.replaceAll("/+$", "") + ADMIN_PATH;
        this.prefix = SlackEnvironment.nonProductionPrefix(environment);
    }

    @Override
    public void notifyRequested(CompanyEditRequestedEvent event) {
        LOGGER.atInfo()
                .addKeyValue("event", REQUESTED_EVENT)
                .addKeyValue("editRequestId", event.requestId())
                .addKeyValue("companyId", event.companyId())
                .log("공연사 정보 수정 요청 editRequestId={} companyId={}", event.requestId(), event.companyId());
        if (webhookUrl == null || webhookUrl.isBlank()) {
            return;
        }
        String message = prefix + "[공연사 수정 요청] " + escape(event.companyName()) + '\n'
                + "사유: " + escape(preview(event.reason())) + '\n'
                + adminLink;
        Thread.ofVirtual().name("company-edit-request-slack").start(() -> {
            try {
                webhookClient.post(webhookUrl, message);
            } catch (RuntimeException exception) {
                LOGGER.atWarn()
                        .addKeyValue("event", "COMPANY_EDIT_REQUEST_SLACK_FAILED")
                        .addKeyValue("editRequestId", event.requestId())
                        .log("공연사 수정 요청 Slack 알림 실패 editRequestId={} reason={}",
                                event.requestId(), exception.getMessage());
            }
        });
    }

    private static String preview(String reason) {
        if (reason.length() <= REASON_PREVIEW_LENGTH) {
            return reason;
        }
        return reason.substring(0, REASON_PREVIEW_LENGTH) + "…";
    }

    private static String escape(String text) {
        return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
