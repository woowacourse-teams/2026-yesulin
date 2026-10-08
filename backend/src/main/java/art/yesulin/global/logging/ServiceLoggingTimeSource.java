package art.yesulin.global.logging;

import org.springframework.stereotype.Component;

@Component
public class ServiceLoggingTimeSource {

    public long nanoTime() {
        return System.nanoTime();
    }
}
