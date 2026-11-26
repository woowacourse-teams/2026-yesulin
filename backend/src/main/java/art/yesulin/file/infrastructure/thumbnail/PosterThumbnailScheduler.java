package art.yesulin.file.infrastructure.thumbnail;

import art.yesulin.file.application.thumbnail.PosterThumbnailWorker;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.core.LockConfiguration;
import net.javacrumbs.shedlock.core.LockProvider;
import net.javacrumbs.shedlock.core.SimpleLock;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("!test")
@RequiredArgsConstructor
@Slf4j
public class PosterThumbnailScheduler {

    private final PosterThumbnailWorker worker;
    private final LockProvider lockProvider;
    private final ScheduledExecutorService executor = Executors.newSingleThreadScheduledExecutor(
            Thread.ofPlatform().daemon().name("poster-thumbnail-worker").factory()
    );

    @PostConstruct
    void start() {
        executor.scheduleWithFixedDelay(this::run, 5, 5, TimeUnit.SECONDS);
    }

    @PreDestroy
    void stop() {
        executor.shutdownNow();
    }

    private void run() {
        try {
            LockConfiguration configuration = new LockConfiguration(
                    Instant.now(), "posterThumbnailWorker", Duration.ofMinutes(10), Duration.ZERO
            );
            lockProvider.lock(configuration).ifPresent(this::processLocked);
        } catch (RuntimeException exception) {
            log.warn("Poster thumbnail worker could not poll", exception);
        }
    }

    private void processLocked(SimpleLock lock) {
        try {
            worker.runNext();
        } finally {
            lock.unlock();
        }
    }
}
