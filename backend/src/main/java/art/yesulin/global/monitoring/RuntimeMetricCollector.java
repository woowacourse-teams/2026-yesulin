package art.yesulin.global.monitoring;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.FunctionCounter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.Meter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.io.IOException;
import java.lang.management.MemoryMXBean;
import java.lang.management.MemoryUsage;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.IdentityHashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

public class RuntimeMetricCollector {

    private final MeterRegistry registry;
    private final MemoryMXBean memory;
    private final Map<Meter, double[]> previous = new IdentityHashMap<>();
    private long previousNanos;
    private boolean sampled;

    public RuntimeMetricCollector(MeterRegistry registry, MemoryMXBean memory) {
        this.registry = registry;
        this.memory = memory;
    }

    public synchronized Map<String, Object> collect(String environment, long timestamp, long nowNanos) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("event", "RUNTIME_METRICS");
        values.put("Environment", environment);
        values.put("sampleTimestamp", timestamp);
        MemoryUsage heap = memory.getHeapMemoryUsage();
        add(values, "JvmHeapUsed", heap.getUsed());
        add(values, "JvmHeapMax", heap.getMax());
        add(values, "JvmNonHeapUsed", memory.getNonHeapMemoryUsage().getUsed());
        gauge(values, "process.cpu.usage", "ProcessCpuUsage", 100);
        gauge(values, "jvm.threads.live", "JvmThreadsLive", 1);
        gauge(values, "tomcat.threads.busy", "TomcatThreadsBusy", 1);
        gauge(values, "tomcat.threads.config.max", "TomcatThreadsMax", 1);
        gauge(values, "hikaricp.connections.active", "DbConnectionsActive", 1);
        gauge(values, "hikaricp.connections.idle", "DbConnectionsIdle", 1);
        gauge(values, "hikaricp.connections.pending", "DbConnectionsPending", 1);
        gauge(values, "hikaricp.connections.max", "DbConnectionsMax", 1);
        timer(values, "hikaricp.connections.acquire", "DbConnectionAcquire", nowNanos);
        counter(values, "hikaricp.connections.timeout", "DbConnectionTimeouts");
        timer(values, "jvm.gc.pause", "GcPause", nowNanos);
        cacheStatistics(values, "hit", "CacheHits");
        cacheStatistics(values, "miss", "CacheMisses");
        gauge(values, "cache.size", "CacheSize", 1);
        previous.keySet().removeIf(meter -> !registry.getMeters().contains(meter));
        previousNanos = nowNanos;
        sampled = true;
        hostMemory(values);
        return values;
    }

    private void gauge(Map<String, Object> values,
                       String meterName, String name, double multiplier) {
        List<Gauge> gauges = new ArrayList<>(registry.find(meterName).gauges());
        if (!gauges.isEmpty() && gauges.stream().allMatch(g -> valid(g.value()))) {
            add(values, name, gauges.stream().mapToDouble(Gauge::value).sum() * multiplier);
        }
    }

    private void counter(Map<String, Object> values,
                         String meterName, String name) {
        List<Counter> counters = new ArrayList<>(registry.find(meterName).counters());
        double total = 0;
        for (Counter counter : counters) {
            double count = counter.count();
            total += delta(counter, count, 0)[0];
        }
        if (sampled && !counters.isEmpty()) {
            add(values, name, total);
        }
    }

    private void cacheStatistics(Map<String, Object> values, String result, String name) {
        List<FunctionCounter> counters = new ArrayList<>(registry.find("cache.gets")
                .tag("result", result).functionCounters());
        if (!counters.isEmpty()) {
            add(values, name, counters.stream().mapToDouble(FunctionCounter::count).sum());
        }
    }

    private void timer(Map<String, Object> values,
                       String meterName, String prefix, long nowNanos) {
        List<Timer> timers = new ArrayList<>(registry.find(meterName).timers());
        double count = 0;
        double elapsed = 0;
        double max = 0;
        for (Timer timer : timers) {
            double[] difference = delta(timer, timer.count(), timer.totalTime(TimeUnit.MILLISECONDS));
            count += difference[0];
            elapsed += difference[1];
            max = Math.max(max, timer.max(TimeUnit.MILLISECONDS));
        }
        if (timers.isEmpty()) {
            return;
        }
        add(values, prefix + "MaxMs", max);
        if (!sampled) {
            return;
        }
        if ("GcPause".equals(prefix)) {
            add(values, "GcPauseCount", count);
            add(values, "GcPauseTimeMs", elapsed);
            double intervalMillis = (nowNanos - previousNanos) / 1_000_000.0;
            if (intervalMillis > 0) {
                add(values, "GcPauseRatio", elapsed / intervalMillis * 100);
            }
        } else if (count > 0) {
            add(values, prefix + "MeanMs", elapsed / count);
        }
    }

    private double[] delta(Meter meter, double count, double elapsed) {
        double[] last = previous.put(meter, new double[]{count, elapsed});
        if (last == null || !valid(count) || !valid(elapsed) || count < last[0] || elapsed < last[1]) {
            return new double[]{0, 0};
        }
        return new double[]{count - last[0], elapsed - last[1]};
    }

    private void hostMemory(Map<String, Object> values) {
        try {
            LinuxMemorySnapshot snapshot = LinuxMemorySnapshot.parse(Files.readAllLines(Path.of("/proc/meminfo")));
            add(values, "HostMemoryAvailable", snapshot.availableBytes());
            add(values, "HostSwapUsed", snapshot.swapUsedBytes());
        } catch (IOException exception) {
            // Linux proc가 없거나 읽을 수 없으면 호스트 값만 생략한다.
        }
    }

    private boolean valid(double value) {
        return Double.isFinite(value) && value >= 0;
    }

    private void add(Map<String, Object> values,
                     String name, double value) {
        if (valid(value)) {
            values.put(name, value);
        }
    }
}
