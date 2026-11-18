package art.yesulin.global.monitoring.application;

import static org.assertj.core.api.Assertions.assertThat;

import art.yesulin.global.monitoring.JvmStartupInfo;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class JvmStartupInfoTest {

    @Test
    void keepsOnlySizingAndGcArgumentsSoSystemPropertiesAreNotLogged() {
        JvmStartupInfo info = new JvmStartupInfo("25.0.4", List.of("Copy", "MarkSweepCompact"), 389_021_696L, 2,
                947_912_704L, 536_866_816L,
                List.of("-Xmx384m", "-XX:+UseSerialGC",
                        "-Dspring.datasource.password=secret", "-Duser.timezone=Asia/Seoul"));

        Map<String, Object> event = info.toEvent("prod");

        assertThat(event)
                .containsEntry("event", "JVM_STARTUP_INFO")
                .containsEntry("Environment", "prod")
                .containsEntry("GarbageCollectors", "Copy,MarkSweepCompact")
                .containsEntry("JvmHeapMax", 389_021_696L)
                .containsEntry("AvailableProcessors", 2)
                .containsEntry("HostMemoryTotal", 947_912_704L)
                .containsEntry("HostSwapTotal", 536_866_816L)
                .containsEntry("JvmArguments", "-Xmx384m -XX:+UseSerialGC");
    }
}
