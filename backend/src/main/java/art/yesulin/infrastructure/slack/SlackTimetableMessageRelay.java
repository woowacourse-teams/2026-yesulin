package art.yesulin.infrastructure.slack;

import art.yesulin.application.timetable.TimetableLinks;
import art.yesulin.application.timetable.TimetableMessageRelay;
import art.yesulin.application.timetable.TimetableMessagesQueuedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * 문자 업체를 연결하기 전의 전달 방법이다. 운영 Slack 채널에 일정표 이름·건수와 관리자 대기열 링크만 보내고,
 * 운영자가 대기열에서 번호와 본문을 복사해 직접 보낸다. 받는 사람 이름·번호와 개인 링크는 Slack에 보내지 않는다.
 * 기획사의 요청 응답이 Slack을 기다리지 않도록 별도 가상 스레드에서 보내고, 실패는 로그로만 남긴다.
 */
@Component
public class SlackTimetableMessageRelay implements TimetableMessageRelay {

    static final String QUEUED_EVENT = "TIMETABLE_MESSAGES_QUEUED";

    private static final Logger LOGGER = LoggerFactory.getLogger(SlackTimetableMessageRelay.class);

    private final String webhookUrl;
    private final SlackWebhookClient webhookClient;
    private final TimetableLinks links;
    private final String environmentLabel;

    public SlackTimetableMessageRelay(
            @Value("${yesulin.slack.timetable-webhook-url:}") String webhookUrl,
            SlackWebhookClient webhookClient,
            TimetableLinks links,
            Environment environment
    ) {
        this.webhookUrl = webhookUrl;
        this.webhookClient = webhookClient;
        this.links = links;
        this.environmentLabel = SlackEnvironment.label(environment);
    }

    @Override
    public void relay(TimetableMessagesQueuedEvent event) {
        LOGGER.atInfo()
                .addKeyValue("event", QUEUED_EVENT)
                .addKeyValue("timetableId", event.timetableId())
                .addKeyValue("count", event.count())
                .log("일정표 문자 대기 timetableId={} count={}", event.timetableId(), event.count());
        if (webhookUrl == null || webhookUrl.isBlank()) {
            return;
        }
        String text = "📨 %s 일정표 문자 %d건 발송 대기 · ‘%s’\n관리자 대기열에서 보내 주세요.\n%s"
                .formatted(environmentLabel, event.count(), event.timetableTitle(), links.messageQueue());
        Thread.ofVirtual().name("timetable-slack-relay").start(() -> post(event, text));
    }

    private void post(TimetableMessagesQueuedEvent event, String text) {
        try {
            webhookClient.post(webhookUrl, text);
        } catch (RuntimeException exception) {
            LOGGER.atWarn()
                    .addKeyValue("event", "TIMETABLE_SLACK_RELAY_FAILED")
                    .addKeyValue("timetableId", event.timetableId())
                    .log("일정표 문자 대기 Slack 알림 실패 timetableId={} reason={}",
                            event.timetableId(), exception.getMessage());
        }
    }
}
