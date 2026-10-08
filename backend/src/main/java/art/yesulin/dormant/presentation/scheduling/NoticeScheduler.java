package art.yesulin.dormant.presentation.scheduling;

import art.yesulin.dormant.application.auditionnotice.NoticeWorker;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

@Configuration
@Profile("!test")
@ConditionalOnProperty(name = "yesulin.sms.worker-enabled", havingValue = "true", matchIfMissing = true)
@EnableScheduling
@RequiredArgsConstructor
public class NoticeScheduler {

    private final NoticeWorker worker;

    @Scheduled(fixedDelayString = "${yesulin.sms.worker-delay:10000}", initialDelay = 30000)
    public void run() {
        worker.tick();
    }
}
