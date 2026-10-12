package art.yesulin.global.monitoring;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.Meter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.lang.management.MemoryMXBean;
import java.lang.management.MemoryUsage;
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
        List<Map<String, Object>> definitions = new ArrayList<>();
        values.put("event", "RUNTIME_METRICS");
        values.put("Environment", environment);
        MemoryUsage heap = memory.getHeapMemoryUsage();
        add(values, definitions, "JvmHeapUsed", "Bytes", heap.getUsed());
        add(values, definitions, "JvmHeapMax", "Bytes", heap.getMax());
        add(values, definitions, "JvmNonHeapUsed", "Bytes", memory.getNonHeapMemoryUsage().getUsed());
        gauge(values, definitions, "process.cpu.usage", "ProcessCpuUsage", "Percent", 100);
        gauge(values, definitions, "jvm.threads.live", "JvmThreadsLive", "Count", 1);
        gauge(values, definitions, "tomcat.threads.busy", "TomcatThreadsBusy", "Count", 1);
        gauge(values, definitions, "tomcat.threads.config.max", "TomcatThreadsMax", "Count", 1);
        gauge(values, definitions, "hikaricp.connections.active", "DbConnectionsActive", "Count", 1);
        gauge(values, definitions, "hikaricp.connections.idle", "DbConnectionsIdle", "Count", 1);
        gauge(values, definitions, "hikaricp.connections.pending", "DbConnectionsPending", "Count", 1);
        gauge(values, definitions, "hikaricp.connections.max", "DbConnectionsMax", "Count", 1);
        timer(values, definitions, "hikaricp.connections.acquire", "DbConnectionAcquire", nowNanos);
        counter(values, definitions, "hikaricp.connections.timeout", "DbConnectionTimeouts");
        timer(values, definitions, "jvm.gc.pause", "GcPause", nowNanos);
        previous.keySet().removeIf(meter -> !registry.getMeters().contains(meter));
        previousNanos = nowNanos;
        sampled = true;
        values.put("_aws", Map.of(
                "Timestamp", timestamp,
                "CloudWatchMetrics", List.of(Map.of(
                        "Namespace", "Yesulin/Application",
                        "Dimensions", List.of(List.of("Environment")),
                        "Metrics", definitions
                ))
        ));
        return values;
    }

    private void gauge(Map<String, Object> values, List<Map<String, Object>> definitions,
                       String meterName, String name, String unit, double multiplier) {
        List<Gauge> gauges = new ArrayList<>(registry.find(meterName).gauges());
        if (!gauges.isEmpty() && gauges.stream().allMatch(g -> valid(g.value()))) {
            add(values, definitions, name, unit, gauges.stream().mapToDouble(Gauge::value).sum() * multiplier);
        }
    }

    private void counter(Map<String, Object> values, List<Map<String, Object>> definitions,
                         String meterName, String name) {
        List<Counter> counters = new ArrayList<>(registry.find(meterName).counters());
        double total = 0;
        for (Counter counter : counters) {
            double count = counter.count();
            total += delta(counter, count, 0)[0];
        }
        if (sampled && !counters.isEmpty()) {
            add(values, definitions, name, "Count", total);
        }
    }

    private void timer(Map<String, Object> values, List<Map<String, Object>> definitions,
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
        add(values, definitions, prefix + "MaxMs", "Milliseconds", max);
        if (!sampled) {
            return;
        }
        if ("GcPause".equals(prefix)) {
            add(values, definitions, "GcPauseCount", "Count", count);
            add(values, definitions, "GcPauseTimeMs", "Milliseconds", elapsed);
            double intervalMillis = (nowNanos - previousNanos) / 1_000_000.0;
            if (intervalMillis > 0) {
                add(values, definitions, "GcPauseRatio", "Percent", elapsed / intervalMillis * 100);
            }
        } else if (count > 0) {
            add(values, definitions, prefix + "MeanMs", "Milliseconds", elapsed / count);
        }
    }

    private double[] delta(Meter meter, double count, double elapsed) {
        double[] last = previous.put(meter, new double[]{count, elapsed});
        if (last == null || !valid(count) || !valid(elapsed) || count < last[0] || elapsed < last[1]) {
            return new double[]{0, 0};
        }
        return new double[]{count - last[0], elapsed - last[1]};
    }

    private boolean valid(double value) {
        return Double.isFinite(value) && value >= 0;
    }

    private void add(Map<String, Object> values, List<Map<String, Object>> definitions,
                     String name, String unit, double value) {
        if (valid(value)) {
            values.put(name, value);
            definitions.add(Map.of("Name", name, "Unit", unit, "StorageResolution", 60));
        }
    }
}
