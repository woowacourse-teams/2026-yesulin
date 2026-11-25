package art.yesulin.auditionpost.presentation.scheduler.counter;

import art.yesulin.auditionpost.application.AuditionPostViewCountService;
import art.yesulin.auditionpost.application.OpenChatVisitService;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.time.Duration;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.function.IntSupplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 모아 둔 조회수와 오픈채팅 방문 수를 전용 스레드로 주기마다 기록한다. 공통 스케줄러 스레드는 공고 수집처럼 긴 작업이 차지할 수 있어 쓰지 않는다.
 * 서버가 여러 대면 서버마다 자기 몫을 더하므로 스케줄 잠금을 걸지 않는다. 정상 종료할 때 남은 값을 기록한다.
 */
@Component
public class AuditionPostCountFlusher {

    private static final Logger LOGGER = LoggerFactory.getLogger(AuditionPostCountFlusher.class);

    private final AuditionPostViewCountService viewCounts;
    private final OpenChatVisitService openChatVisits;
    private final Duration interval;
    private final ScheduledExecutorService executor = Executors.newSingleThreadScheduledExecutor(
            Thread.ofPlatform().name("count-flush").daemon(true).factory());

    public AuditionPostCountFlusher(
            AuditionPostViewCountService viewCounts,
            OpenChatVisitService openChatVisits,
            @Value("${yesulin.audition-post.count-flush-interval:PT3S}") Duration interval
    ) {
        this.viewCounts = viewCounts;
        this.openChatVisits = openChatVisits;
        this.interval = interval;
    }

    @PostConstruct
    public void start() {
        long millis = interval.toMillis();
        executor.scheduleWithFixedDelay(this::flushAll, millis, millis, TimeUnit.MILLISECONDS);
    }

    @PreDestroy
    public void stop() throws InterruptedException {
        executor.shutdown();
        executor.awaitTermination(5, TimeUnit.SECONDS);
        flushAll();
    }

    private void flushAll() {
        flushSafely("view counts", viewCounts::flush);
        flushSafely("openchat visits", openChatVisits::flush);
    }

    private void flushSafely(String name, IntSupplier flush) {
        try {
            flush.getAsInt();
        } catch (RuntimeException exception) {
            LOGGER.warn("Failed to flush audition post {}", name, exception);
        }
    }
}
