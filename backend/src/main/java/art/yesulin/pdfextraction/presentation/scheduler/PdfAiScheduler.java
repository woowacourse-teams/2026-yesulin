package art.yesulin.pdfextraction.presentation.scheduler;

import art.yesulin.pdfextraction.application.ai.PdfAiWorker;
import jakarta.annotation.PreDestroy;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import lombok.RequiredArgsConstructor;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

@Configuration
@EnableScheduling
@Profile("!test")
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "yesulin.pdf-ai", name = "enabled", havingValue = "true")
public class PdfAiScheduler {

    private final PdfAiWorker worker;
    private final AtomicBoolean busy = new AtomicBoolean();
    private final ExecutorService executor = Executors.newThreadPerTaskExecutor(
            Thread.ofVirtual().name("pdf-ai-", 0).factory());

    @Scheduled(fixedDelayString = "${yesulin.pdf-ai.worker-delay:5000}", initialDelay = 5000)
    @SchedulerLock(name = "pdfAiWorker", lockAtMostFor = "PT2M", lockAtLeastFor = "PT1S")
    public void run() {
        if (busy.compareAndSet(false, true)) {
            executor.execute(() -> {
                try {
                    worker.tick();
                } finally {
                    busy.set(false);
                }
            });
        }
    }

    @PreDestroy
    public void close() {
        executor.close();
    }
}
