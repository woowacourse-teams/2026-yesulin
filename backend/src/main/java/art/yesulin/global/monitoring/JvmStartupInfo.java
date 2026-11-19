package art.yesulin.global.monitoring;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public record JvmStartupInfo(
        String javaVersion,
        List<String> garbageCollectors,
        long heapMaxBytes,
        int availableProcessors,
        long hostMemoryBytes,
        long hostSwapBytes,
        List<String> jvmArguments
) {

    public JvmStartupInfo {
        garbageCollectors = List.copyOf(garbageCollectors);
        jvmArguments = jvmArguments.stream().filter(JvmStartupInfo::isSizingOrGcOption).toList();
    }

    private static boolean isSizingOrGcOption(String argument) {
        return argument.startsWith("-Xm") || argument.startsWith("-Xss") || argument.startsWith("-XX:");
    }

    public Map<String, Object> toEvent(String environment) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("event", "JVM_STARTUP_INFO");
        values.put("Environment", environment);
        values.put("JavaVersion", javaVersion);
        values.put("GarbageCollectors", String.join(",", garbageCollectors));
        values.put("JvmHeapMax", heapMaxBytes);
        values.put("AvailableProcessors", availableProcessors);
        values.put("HostMemoryTotal", hostMemoryBytes);
        values.put("HostSwapTotal", hostSwapBytes);
        values.put("JvmArguments", String.join(" ", jvmArguments));
        return values;
    }
}
