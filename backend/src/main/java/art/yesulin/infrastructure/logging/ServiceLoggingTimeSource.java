package art.yesulin.infrastructure.logging;

import org.springframework.stereotype.Component;

@Component
public class ServiceLoggingTimeSource {

    public long nanoTime() {
        return System.nanoTime();
    }
}
