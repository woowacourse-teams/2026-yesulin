package art.yesulin.global.monitoring.application;

import static org.assertj.core.api.Assertions.assertThat;

import art.yesulin.global.monitoring.LinuxMemorySnapshot;
import java.util.List;
import org.junit.jupiter.api.Test;

class LinuxMemorySnapshotTest {

    @Test
    void reportsAvailableMemoryIncludingReclaimableCacheAndActualSwapUsage() {
        LinuxMemorySnapshot snapshot = LinuxMemorySnapshot.parse(List.of(
                "MemFree: 10 kB", "MemAvailable:    300 kB", "SwapTotal: 100 kB", "SwapFree: 80 kB"));
        assertThat(snapshot.availableBytes()).isEqualTo(300 * 1024);
        assertThat(snapshot.swapUsedBytes()).isEqualTo(20 * 1024);
    }

    @Test
    void missingOrInconsistentFieldsAreUnknownRatherThanZero() {
        LinuxMemorySnapshot missing = LinuxMemorySnapshot.parse(List.of("MemFree: 10 kB", "SwapTotal: 100 kB"));
        assertThat(missing.availableBytes()).isEqualTo(-1);
        assertThat(missing.swapUsedBytes()).isEqualTo(-1);
        assertThat(LinuxMemorySnapshot.parse(List.of("SwapTotal: 50 kB", "SwapFree: 80 kB")).swapUsedBytes())
                .isEqualTo(-1);
    }

    @Test
    void hostWithoutSwapReportsZeroUsage() {
        assertThat(LinuxMemorySnapshot.parse(List.of("SwapTotal: 0 kB", "SwapFree: 0 kB")).swapUsedBytes())
                .isZero();
    }
}
