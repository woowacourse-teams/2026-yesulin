package art.yesulin.global.monitoring;

import com.sun.management.OperatingSystemMXBean;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.annotation.PreDestroy;
import java.lang.management.GarbageCollectorMXBean;
import java.lang.management.ManagementFactory;
import java.time.Duration;
import java.util.Arrays;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.spi.LoggingEventBuilder;
import org.springframework.beans.factory.annotation.Value;
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
    private static final Duration FIRST_SAMPLE_DELAY = Duration.ofSeconds(30);
    private static final Duration DEFAULT_PUBLISH_INTERVAL = Duration.ofSeconds(60);
    private static final Duration SHORTEST_PUBLISH_INTERVAL = Duration.ofSeconds(1);

    private final ScheduledExecutorService executor = Executors.newSingleThreadScheduledExecutor(
            Thread.ofPlatform().name("runtime-metrics").daemon(true).factory());
    private final RuntimeMetricCollector collector;
    private final String environment;
    private final Duration publishInterval;

    public RuntimeMetricPublisher(
            MeterRegistry registry, Environment environment,
            @Value("${yesulin.monitoring.publish-interval:PT60S}") Duration publishInterval
    ) {
        this.collector = new RuntimeMetricCollector(registry, ManagementFactory.getMemoryMXBean());
        this.environment = Arrays.asList(environment.getActiveProfiles()).contains("prod") ? "prod" : "dev";
        this.publishInterval = usableInterval(publishInterval);
    }

    private static Duration usableInterval(Duration configured) {
        if (configured == null) {
            return DEFAULT_PUBLISH_INTERVAL;
        }
        return configured.compareTo(SHORTEST_PUBLISH_INTERVAL) < 0 ? SHORTEST_PUBLISH_INTERVAL : configured;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void start() {
        logStartupInfo();
        executor.scheduleWithFixedDelay(
                this::publish, FIRST_SAMPLE_DELAY.toMillis(), publishInterval.toMillis(), TimeUnit.MILLISECONDS);
    }

    private void logStartupInfo() {
        try {
            OperatingSystemMXBean os = ManagementFactory.getPlatformMXBean(OperatingSystemMXBean.class);
            JvmStartupInfo info = new JvmStartupInfo(
                    Runtime.version().toString(),
                    ManagementFactory.getGarbageCollectorMXBeans().stream()
                            .map(GarbageCollectorMXBean::getName).toList(),
                    Runtime.getRuntime().maxMemory(),
                    Runtime.getRuntime().availableProcessors(),
                    os.getTotalMemorySize(),
                    os.getTotalSwapSpaceSize(),
                    ManagementFactory.getRuntimeMXBean().getInputArguments());
            LoggingEventBuilder event = LOGGER.atInfo();
            info.toEvent(environment).forEach(event::addKeyValue);
            event.log("JVM 기동 정보");
        } catch (RuntimeException exception) {
            LOGGER.atWarn().setCause(exception).log("JVM 기동 정보를 남기지 못했습니다.");
        }
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
