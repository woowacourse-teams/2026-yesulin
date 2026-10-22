package art.yesulin.auditionpost.infrastructure.slack;

import art.yesulin.auditionpost.application.AuditionPostChange;
import art.yesulin.auditionpost.application.ProducerAuditionPostEditedEvent;
import art.yesulin.auditionpost.application.ProducerAuditionPostNotifier;
import art.yesulin.auditionpost.application.ProducerAuditionPostPublishedEvent;
import art.yesulin.auditionpost.application.notice.OtrNoticeLink;
import art.yesulin.infrastructure.slack.SlackEnvironment;
import art.yesulin.infrastructure.slack.SlackWebhookClient;
import java.util.Objects;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * 기획사가 올리거나 고친 공고를 OTR 공고 알림 채널로 보낸다. 새 공고는 OTR 공고 알림과 같은 형식이라 운영자가 첫 줄만 빼고
 * 오픈채팅방에 그대로 옮길 수 있다. 웹훅이 없는 환경에서는 로그만 남긴다. 기획사의 요청 응답이 Slack을 기다리지 않도록
 * 별도 가상 스레드에서 보내고, 실패는 로그로만 남긴다.
 */
@Component
public class SlackProducerAuditionPostNotifier implements ProducerAuditionPostNotifier {

    static final String PUBLISHED_EVENT = "PRODUCER_AUDITION_POST_PUBLISHED";
    static final String EDITED_EVENT = "PRODUCER_AUDITION_POST_EDITED";

    private static final Logger LOGGER = LoggerFactory.getLogger(SlackProducerAuditionPostNotifier.class);
    private static final String UNKNOWN_COMPANY = "기획사";

    private final String webhookUrl;
    private final SlackWebhookClient webhookClient;
    private final OtrNoticeLink links;
    private final String prefix;

    public SlackProducerAuditionPostNotifier(
            @Value("${yesulin.slack.notice-webhook-url:}") String webhookUrl,
            SlackWebhookClient webhookClient,
            OtrNoticeLink links,
            Environment environment
    ) {
        this.webhookUrl = webhookUrl;
        this.webhookClient = webhookClient;
        this.links = links;
        this.prefix = SlackEnvironment.nonProductionPrefix(environment);
    }

    @Override
    public void notifyPublished(ProducerAuditionPostPublishedEvent event) {
        log(PUBLISHED_EVENT, "기획사 공고 등록", event.postId());
        StringBuilder message = new StringBuilder(prefix).append("[공연사 등록] ")
                .append(SlackAuditionMessages.escape(company(event.companyName()))).append('\n')
                .append(SlackAuditionMessages.header(1));
        SlackAuditionMessages.appendAlert(message, event.category(), event.title(), event.pay(),
                event.deadlineText(), links.openChatPostLink(event.postId()));
        send(event.postId(), message.toString());
    }

    @Override
    public void notifyEdited(ProducerAuditionPostEditedEvent event) {
        log(EDITED_EVENT, "기획사 공고 수정", event.postId());
        String changes = event.changes().stream().map(AuditionPostChange::label).collect(Collectors.joining(", "));
        String message = prefix + "[공연사 수정] " + SlackAuditionMessages.escape(company(event.companyName())) + '\n'
                + SlackAuditionMessages.escape(event.title()) + '\n'
                + "바뀐 항목: " + changes + '\n'
                + links.postLink(event.postId());
        send(event.postId(), message);
    }

    private void send(long postId, String message) {
        if (webhookUrl == null || webhookUrl.isBlank()) {
            return;
        }
        Thread.ofVirtual().name("audition-post-slack").start(() -> {
            try {
                webhookClient.post(webhookUrl, message);
            } catch (RuntimeException exception) {
                LOGGER.atWarn()
                        .addKeyValue("event", "PRODUCER_AUDITION_POST_SLACK_FAILED")
                        .addKeyValue("postId", postId)
                        .log("기획사 공고 Slack 알림 실패 postId={} reason={}", postId, exception.getMessage());
            }
        });
    }

    private static void log(String eventName, String action, long postId) {
        LOGGER.atInfo()
                .addKeyValue("event", eventName)
                .addKeyValue("postId", postId)
                .log("{} postId={}", action, postId);
    }

    private static String company(String companyName) {
        return Objects.requireNonNullElse(companyName, UNKNOWN_COMPANY);
    }
}
