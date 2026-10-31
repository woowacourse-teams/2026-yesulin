package art.yesulin.pdfextraction.application.ai;

import jakarta.annotation.PreDestroy;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.function.LongSupplier;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@ConditionalOnProperty(prefix = "yesulin.pdf-ai", name = "enabled", havingValue = "true")
public class PdfAiDispatcher {

    private final PdfAiWorker worker;
    private final int concurrency;
    private final ExecutorService executor;
    private final ScheduledExecutorService wakeups;
    private final long requestIntervalNanos;
    private final LongSupplier nanoTime;
    private int activeWorkers;
    private long wakeVersion;
    private boolean closed;
    private boolean delayedWakePending;
    private long nextWakeAt;

    @Autowired
    public PdfAiDispatcher(PdfAiWorker worker, PdfAiProperties properties) {
        this(worker, properties, Executors.newThreadPerTaskExecutor(
                Thread.ofVirtual().name("pdf-ai-", 0).factory()),
                Executors.newSingleThreadScheduledExecutor(
                        Thread.ofPlatform().daemon().name("pdf-ai-wakeup").factory()), System::nanoTime);
    }

    PdfAiDispatcher(PdfAiWorker worker, PdfAiProperties properties, ExecutorService executor,
                    ScheduledExecutorService wakeups, LongSupplier nanoTime) {
        this.worker = worker;
        this.concurrency = properties.concurrency();
        this.executor = executor;
        this.wakeups = wakeups;
        this.requestIntervalNanos = properties.requestInterval().toNanos();
        this.nanoTime = nanoTime;
    }

    // 신호는 합치고 작업은 DB에서 획득한다. HTTP 요청 스레드에서는 AI나 DB claim을 실행하지 않는다.
    public synchronized void wakeUp() {
        if (!closed) {
            wakeVersion++;
            startWorkers();
        }
    }

    // 획득이 커밋된 작업만 다음 신호를 예약한다. 빈 큐를 호출 간격마다 계속 폴링하지 않는다.
    public synchronized void wakeUpAfterInterval() {
        if (!closed) {
            nextWakeAt = nanoTime.getAsLong() + requestIntervalNanos;
            if (!delayedWakePending) {
                delayedWakePending = true;
                scheduleWakeUp(requestIntervalNanos);
            }
        }
    }

    private void scheduleWakeUp(long delayNanos) {
        try {
            wakeups.schedule(this::wakeAfterInterval, delayNanos, TimeUnit.NANOSECONDS);
        } catch (RejectedExecutionException exception) {
            delayedWakePending = false;
            log.warn("PDF_AI_WAKEUP_REJECTED");
        }
    }

    private synchronized void wakeAfterInterval() {
        if (closed) {
            delayedWakePending = false;
            return;
        }
        long remaining = nextWakeAt - nanoTime.getAsLong();
        if (remaining > 0) {
            scheduleWakeUp(remaining);
            return;
        }
        delayedWakePending = false;
        wakeUp();
    }

    private void startWorkers() {
        int available = concurrency - activeWorkers;
        if (requestIntervalNanos > 0) {
            available = Math.min(available, 1);
        }
        for (int index = 0; index < available; index++) {
            activeWorkers++;
            try {
                executor.execute(this::drain);
            } catch (RejectedExecutionException exception) {
                activeWorkers--;
                log.warn("PDF_AI_DISPATCH_REJECTED");
                return;
            }
        }
    }

    private void drain() {
        long observedVersion = -1;
        try {
            while (true) {
                synchronized (this) {
                    if (closed) {
                        return;
                    }
                    observedVersion = wakeVersion;
                }
                if (worker.tick()) {
                    continue;
                }
                synchronized (this) {
                    if (observedVersion == wakeVersion) {
                        return;
                    }
                }
            }
        } catch (RuntimeException exception) {
            log.warn("PDF_AI_DISPATCH_FAILED errorType={}", exception.getClass().getSimpleName());
        } finally {
            synchronized (this) {
                activeWorkers--;
                if (!closed && observedVersion != wakeVersion) {
                    startWorkers();
                }
            }
        }
    }

    @PreDestroy
    public void close() {
        synchronized (this) {
            closed = true;
        }
        wakeups.shutdownNow();
        executor.close();
    }
}
