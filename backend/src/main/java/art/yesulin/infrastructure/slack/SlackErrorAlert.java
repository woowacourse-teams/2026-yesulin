package art.yesulin.infrastructure.slack;

import art.yesulin.global.alert.ErrorAlert;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * 예상하지 못한 서버 오류를 버그 알림 Slack 채널로 보낸다. 요청 방식·요청 패턴·예외 종류·요청 ID만 보내고,
 * 같은 곳에서 같은 예외가 반복되면 {@link #QUIET_PERIOD} 동안 한 번만 알린다. 요청 응답이 Slack을 기다리지 않도록
 * 가상 스레드에서 보내고 실패는 로그로만 남긴다.
 */
@Component
public class SlackErrorAlert implements ErrorAlert {

    static final Duration QUIET_PERIOD = Duration.ofMinutes(10);

    private static final Logger LOGGER = LoggerFactory.getLogger(SlackErrorAlert.class);

    private final String webhookUrl;
    private final SlackWebhookClient webhookClient;
    private final String environmentLabel;
    private final Clock clock;
    private final Executor executor;
    private final Map<String, Instant> lastAlerted = new ConcurrentHashMap<>();

    @Autowired
    public SlackErrorAlert(
            @Value("${yesulin.slack.error-webhook-url:}") String webhookUrl,
            SlackWebhookClient webhookClient,
            Environment environment,
            Clock clock
    ) {
        this(webhookUrl, webhookClient, SlackEnvironment.label(environment), clock,
                task -> Thread.ofVirtual().name("error-slack-alert").start(task));
    }

    SlackErrorAlert(
            String webhookUrl,
            SlackWebhookClient webhookClient,
            String environmentLabel,
            Clock clock,
            Executor executor
    ) {
        this.webhookUrl = webhookUrl;
        this.webhookClient = webhookClient;
        this.environmentLabel = environmentLabel;
        this.clock = clock;
        this.executor = executor;
    }

    @Override
    public void unexpected(UnexpectedError error) {
        if (webhookUrl == null || webhookUrl.isBlank() || !firstInQuietPeriod(error)) {
            return;
        }
        String text = "🚨 %s 서버 오류\n%s %s\n%s · requestId=%s".formatted(
                environmentLabel, error.method(), error.endpoint(), error.exception(), error.requestId()
        );
        executor.execute(() -> post(text));
    }

    private boolean firstInQuietPeriod(UnexpectedError error) {
        Instant now = clock.instant();
        String key = error.method() + " " + error.endpoint() + " " + error.exception();
        Instant previous = lastAlerted.get(key);
        if (previous != null && previous.plus(QUIET_PERIOD).isAfter(now)) {
            return false;
        }
        return previous == null
                ? lastAlerted.putIfAbsent(key, now) == null
                : lastAlerted.replace(key, previous, now);
    }

    private void post(String text) {
        try {
            webhookClient.post(webhookUrl, text);
        } catch (RuntimeException exception) {
            LOGGER.atWarn()
                    .addKeyValue("event", "ERROR_SLACK_ALERT_FAILED")
                    .log("서버 오류 Slack 알림 실패 reason={}", exception.getMessage());
        }
    }
}
