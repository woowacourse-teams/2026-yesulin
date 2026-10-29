package art.yesulin.event.infrastructure.slack;

import art.yesulin.event.application.registration.EventRegisteredEvent;
import art.yesulin.event.application.registration.EventRegistrationNotifier;
import art.yesulin.event.domain.registration.EventParticipantType;
import art.yesulin.infrastructure.slack.SlackEnvironment;
import art.yesulin.infrastructure.slack.SlackWebhookClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/** 저장된 접수의 알림을 전용 채널로 비동기 전송한다. 웹훅이 없으면 로그만 남긴다. */
@Component
public class SlackEventRegistrationNotifier implements EventRegistrationNotifier {

    private static final Logger LOGGER = LoggerFactory.getLogger(SlackEventRegistrationNotifier.class);

    private final String webhookUrl;
    private final String adminBaseUrl;
    private final String prefix;
    private final SlackWebhookClient webhookClient;

    public SlackEventRegistrationNotifier(
            @Value("${yesulin.slack.event-registration-webhook-url:}") String webhookUrl,
            @Value("${yesulin.slack.event-registration-admin-base-url:${yesulin.notice.link-base-url}}")
            String adminBaseUrl,
            @Value("${yesulin.notice.link-base-url}") String noticeBaseUrl,
            SlackWebhookClient webhookClient,
            Environment environment
    ) {
        this.webhookUrl = webhookUrl;
        this.adminBaseUrl = (adminBaseUrl.isBlank() ? noticeBaseUrl : adminBaseUrl).strip().replaceAll("/+$", "");
        this.webhookClient = webhookClient;
        this.prefix = SlackEnvironment.nonProductionPrefix(environment);
    }

    @Override
    public void notifyRegistered(EventRegisteredEvent event) {
        LOGGER.atInfo().addKeyValue("event", "EVENT_REGISTERED")
                .addKeyValue("eventId", event.eventId()).addKeyValue("registrationId", event.registrationId())
                .log("이벤트 참가 신청 접수 eventId={} registrationId={}", event.eventId(), event.registrationId());
        if (webhookUrl == null || webhookUrl.isBlank()) {
            return;
        }
        String participant = event.participantType() == EventParticipantType.ACTOR ? "배우·일반 참가자" : "관계자";
        String message = prefix + "[이벤트 참가 신청] " + escape(event.eventTitle()) + '\n'
                + "신청 번호: " + event.registrationId() + '\n'
                + "참가 구분: " + participant + '\n'
                + "명함 제작: " + (event.businessCardRequested() ? "신청" : "미신청") + '\n'
                + adminBaseUrl + "/admin/events/" + event.eventId();
        Thread.ofVirtual().name("event-registration-slack").start(() -> {
            try {
                webhookClient.post(webhookUrl, message);
            } catch (RuntimeException exception) {
                LOGGER.atWarn().addKeyValue("event", "EVENT_REGISTRATION_SLACK_FAILED")
                        .addKeyValue("eventId", event.eventId()).addKeyValue("registrationId", event.registrationId())
                        .log("이벤트 참가 신청 Slack 알림 실패 eventId={} registrationId={} reason={}",
                                event.eventId(), event.registrationId(), exception.getClass().getSimpleName());
            }
        });
    }

    private static String escape(String text) {
        return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
