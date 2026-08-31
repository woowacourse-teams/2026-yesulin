package art.yesulin.infrastructure.logging;

import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.spi.LoggingEventBuilder;
import org.springframework.stereotype.Component;

@Aspect
@Component
@RequiredArgsConstructor
public class ApplicationServiceLoggingAspect {

    private static final Logger LOGGER = LoggerFactory.getLogger(ApplicationServiceLoggingAspect.class);
    private static final long SLOW_SERVICE_MILLIS = 500L;

    private final ServiceLoggingTimeSource timeSource;

    @Around("execution(public * art.yesulin.application..*(..)) "
            + "&& @within(org.springframework.stereotype.Service)")
    public Object logExecution(ProceedingJoinPoint joinPoint) throws Throwable {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        String className = signature.getDeclaringType().getSimpleName();
        String methodName = signature.getName();
        long startNanos = timeSource.nanoTime();

        try {
            Object result = joinPoint.proceed();
            logCompletion(className, methodName, "SUCCESS", startNanos);
            return result;
        } catch (Throwable throwable) {
            logCompletion(className, methodName, "FAILURE", startNanos);
            throw throwable;
        }
    }

    private void logCompletion(String className, String methodName, String outcome, long startNanos) {
        long elapsedMillis = TimeUnit.NANOSECONDS.toMillis(timeSource.nanoTime() - startNanos);
        if (elapsedMillis >= SLOW_SERVICE_MILLIS) {
            logEvent(LOGGER.atWarn(), "SLOW_SERVICE", className, methodName, outcome, elapsedMillis);
            return;
        }

        if ("SUCCESS".equals(outcome)) {
            logEvent(LOGGER.atDebug(), "SERVICE_CALL", className, methodName, outcome, elapsedMillis);
        }
    }

    private void logEvent(
            LoggingEventBuilder builder,
            String event,
            String className,
            String methodName,
            String outcome,
            long elapsedMillis
    ) {
        builder.addKeyValue("event", event)
                .addKeyValue("class", className)
                .addKeyValue("method", methodName)
                .addKeyValue("outcome", outcome)
                .addKeyValue("elapsedMs", elapsedMillis)
                .log(
                        "APPLICATION class={} method={} outcome={} elapsedMs={}",
                        className,
                        methodName,
                        outcome,
                        elapsedMillis
                );
    }
}
