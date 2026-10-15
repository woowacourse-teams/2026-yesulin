package art.yesulin.global.monitoring.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import art.yesulin.global.monitoring.RuntimeMetricCollector;
import io.micrometer.core.instrument.FunctionCounter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.Timer;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.lang.management.MemoryMXBean;
import java.lang.management.MemoryUsage;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

class RuntimeMetricCollectorTest {

    private final SimpleMeterRegistry registry = new SimpleMeterRegistry();
    private final MemoryMXBean memory = mock(MemoryMXBean.class);
    private final RuntimeMetricCollector collector = new RuntimeMetricCollector(registry, memory);

    @BeforeEach
    void memoryUsage() {
        when(memory.getHeapMemoryUsage()).thenReturn(new MemoryUsage(0, 100, 200, 400));
        when(memory.getNonHeapMemoryUsage()).thenReturn(new MemoryUsage(0, 50, 100, -1));
    }

    @Test
    void emitsNumericSnapshotWithoutEmfAndOmitsMissingOrInvalidGauges() {
        Gauge.builder("jvm.threads.live", () -> 20).register(registry);
        Gauge.builder("process.cpu.usage", () -> 0.25).register(registry);
        Gauge.builder("hikaricp.connections.pending", () -> Double.NaN).register(registry);

        JsonNode event = new ObjectMapper().valueToTree(collector.collect("prod", 1_800_000_000_000L, 0));
        assertThat(event.get("JvmHeapUsed").asDouble()).isEqualTo(100);
        assertThat(event.get("ProcessCpuUsage").asDouble()).isEqualTo(25);
        assertThat(event.has("TomcatThreadsBusy")).isFalse();
        assertThat(event.has("DbConnectionsPending")).isFalse();
        assertThat(event.get("JvmHeapUsed").isNumber()).isTrue();
        assertThat(event.get("Environment").asString()).isEqualTo("prod");
        assertThat(event.get("sampleTimestamp").asLong()).isEqualTo(1_800_000_000_000L);
        assertThat(event.has("_aws")).isFalse();
    }

    @Test
    void aggregatesPoolGaugesAndReadsTomcatConfiguredMaximum() {
        AtomicInteger first = new AtomicInteger(3);
        AtomicInteger second = new AtomicInteger(4);
        Gauge.builder("hikaricp.connections.active", first, AtomicInteger::get).tag("pool", "first").register(registry);
        Gauge.builder("hikaricp.connections.active", second, AtomicInteger::get)
                .tag("pool", "second").register(registry);
        Gauge.builder("tomcat.threads.config.max", () -> 200).register(registry);

        Map<String, Object> event = collector.collect("dev", 0, 0);
        assertThat(event).containsEntry("DbConnectionsActive", 7.0).containsEntry("TomcatThreadsMax", 200.0);
    }

    @Test
    void usesIntervalDeltasAcrossGcCausesAndActualElapsedTime() {
        Timer first = registry.timer("jvm.gc.pause", "cause", "first");
        final Timer second = registry.timer("jvm.gc.pause", "cause", "second");
        first.record(Duration.ofSeconds(5));
        Map<String, Object> baseline = collector.collect("dev", 0, 0);
        assertThat(baseline).doesNotContainKeys("GcPauseCount", "GcPauseTimeMs", "GcPauseRatio");
        first.record(Duration.ofMillis(100));
        second.record(Duration.ofMillis(200));

        Map<String, Object> event = collector.collect("dev", 0, 30_000_000_000L);
        assertThat(event).containsEntry("GcPauseCount", 2.0).containsEntry("GcPauseTimeMs", 300.0);
        assertThat(event).containsEntry("GcPauseRatio", 1.0);
        assertThat(collector.collect("dev", 0, 90_000_000_000L))
                .containsEntry("GcPauseCount", 0.0).containsEntry("GcPauseRatio", 0.0);
    }

    @Test
    void reportsAcquisitionMeanOnlyWhenConnectionsWereAcquiredAndHandlesMeterReplacement() {
        Timer acquire = registry.timer("hikaricp.connections.acquire", "pool", "main");
        registry.counter("hikaricp.connections.timeout", "pool", "main").increment(50);
        collector.collect("prod", 0, 0);
        acquire.record(Duration.ofMillis(20));
        acquire.record(Duration.ofMillis(40));
        registry.counter("hikaricp.connections.timeout", "pool", "main").increment(2);

        Map<String, Object> event = collector.collect("prod", 0, 60_000_000_000L);
        assertThat(event).containsEntry("DbConnectionAcquireMeanMs", 30.0);
        assertThat(event).containsEntry("DbConnectionTimeouts", 2.0);
        registry.remove(acquire);
        registry.timer("hikaricp.connections.acquire", "pool", "main").record(Duration.ofMillis(10));
        assertThat(collector.collect("prod", 0, 120_000_000_000L)).doesNotContainKey("DbConnectionAcquireMeanMs");
    }

    @Test
    void omitsUndefinedHeapLimitAndDoesNotExposeNonHeapLimit() {
        when(memory.getHeapMemoryUsage()).thenReturn(new MemoryUsage(0, 100, 200, -1));
        assertThat(collector.collect("dev", 0, 0)).doesNotContainKeys("JvmHeapMax", "JvmNonHeapMax");
    }

    @Test
    void readsCumulativeCacheFunctionCountersWithoutCustomMetricEnvelope() {
        AtomicInteger hits = new AtomicInteger(10);
        AtomicInteger misses = new AtomicInteger(2);
        FunctionCounter.builder("cache.gets", hits, AtomicInteger::get)
                .tags("cache", "counts", "result", "hit").register(registry);
        FunctionCounter.builder("cache.gets", misses, AtomicInteger::get)
                .tags("cache", "counts", "result", "miss").register(registry);
        Gauge.builder("cache.size", () -> 1).tag("cache", "counts").register(registry);

        assertThat(collector.collect("dev", 0, 0))
                .containsEntry("CacheHits", 10.0).containsEntry("CacheMisses", 2.0).containsEntry("CacheSize", 1.0)
                .doesNotContainKey("_aws");
        hits.incrementAndGet();
        assertThat(collector.collect("dev", 0, 60_000_000_000L)).containsEntry("CacheHits", 11.0);
    }
}
