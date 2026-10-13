package art.yesulin.global.monitoring;

import io.micrometer.core.instrument.MeterRegistry;
import jakarta.annotation.PreDestroy;
import java.lang.management.ManagementFactory;
import java.util.Arrays;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.spi.LoggingEventBuilder;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Profile;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
@Profile({"dev", "prod"})
@ConditionalOnProperty(prefix = "yesulin.monitoring", name = "enabled", havingValue = "true", matchIfMissing = true)
public class RuntimeMetricPublisher {

    private static final Logger LOGGER = LoggerFactory.getLogger(RuntimeMetricPublisher.class);

    private final ScheduledExecutorService executor = Executors.newSingleThreadScheduledExecutor(
            Thread.ofPlatform().name("runtime-metrics").daemon(true).factory());
    private final RuntimeMetricCollector collector;
    private final String environment;

    public RuntimeMetricPublisher(MeterRegistry registry, Environment environment) {
        this.collector = new RuntimeMetricCollector(registry, ManagementFactory.getMemoryMXBean());
        this.environment = Arrays.asList(environment.getActiveProfiles()).contains("prod") ? "prod" : "dev";
    }

    @EventListener(ApplicationReadyEvent.class)
    public void start() {
        executor.scheduleWithFixedDelay(this::publish, 30, 60, TimeUnit.SECONDS);
    }

    public void publish() {
        try {
            Map<String, Object> snapshot = collector.collect(
                    environment, System.currentTimeMillis(), System.nanoTime());
            LoggingEventBuilder event = LOGGER.atInfo();
            snapshot.forEach(event::addKeyValue);
            event.log("애플리케이션 런타임 메트릭");
        } catch (RuntimeException exception) {
            LOGGER.atError().addKeyValue("event", "RUNTIME_METRICS_FAILURE").setCause(exception)
                    .log("런타임 메트릭 수집에 실패했습니다.");
        }
    }

    @PreDestroy
    public void stop() {
        executor.shutdownNow();
    }
}
