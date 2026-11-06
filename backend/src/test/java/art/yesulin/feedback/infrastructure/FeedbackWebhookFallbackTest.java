package art.yesulin.feedback.infrastructure;

import static org.junit.jupiter.api.Assertions.assertEquals;

import art.yesulin.support.ObjectStorageTestConfiguration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.core.env.Environment;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:feedback-webhook;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate",
        "YESULIN_ERROR_SLACK_WEBHOOK_URL=https://hooks.test/error"
})
@Import(ObjectStorageTestConfiguration.class)
class FeedbackWebhookFallbackTest {

    @Autowired
    private Environment environment;

    @Test
    @DisplayName("의견 전용 웹훅 변수가 없으면 버그 알림 채널 웹훅을 쓴다")
    void fallsBackToErrorChannelWebhook() {
        assertEquals("https://hooks.test/error", environment.getProperty("yesulin.slack.feedback-webhook-url"));
    }
}
