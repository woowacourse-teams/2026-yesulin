package art.yesulin.global.monitoring;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public record LinuxMemorySnapshot(long availableBytes, long swapUsedBytes) {

    public static LinuxMemorySnapshot parse(List<String> lines) {
        Map<String, Long> values = new HashMap<>();
        for (String line : lines) {
            String[] fields = line.trim().split("\\s+");
            if (fields.length == 3 && "kB".equals(fields[2])
                    && List.of("MemAvailable:", "SwapTotal:", "SwapFree:").contains(fields[0])) {
                values.put(fields[0], Long.parseLong(fields[1]) * 1024);
            }
        }
        long total = values.getOrDefault("SwapTotal:", -1L);
        long free = values.getOrDefault("SwapFree:", -1L);
        long used = total >= 0 && free >= 0 && free <= total ? total - free : -1;
        return new LinuxMemorySnapshot(values.getOrDefault("MemAvailable:", -1L), used);
    }
}
