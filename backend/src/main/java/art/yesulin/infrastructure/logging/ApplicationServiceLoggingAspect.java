package art.yesulin.infrastructure.logging;

import art.yesulin.common.exception.BusinessException;
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
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

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
            logCompletion(className, methodName, "SUCCESS", startNanos, null);
            return result;
        } catch (Throwable throwable) {
            logCompletion(className, methodName, "FAILURE", startNanos, throwable);
            throw throwable;
        }
    }

    private void logCompletion(
            String className,
            String methodName,
            String outcome,
            long startNanos,
            Throwable failure
    ) {
        long elapsedMillis = TimeUnit.NANOSECONDS.toMillis(timeSource.nanoTime() - startNanos);
        if (elapsedMillis >= SLOW_SERVICE_MILLIS) {
            logEvent(LOGGER.atWarn(), "SLOW_SERVICE", className, methodName, outcome, elapsedMillis);
            return;
        }

        if ("SUCCESS".equals(outcome)) {
            logEvent(LOGGER.atDebug(), "SERVICE_CALL", className, methodName, outcome, elapsedMillis);
            return;
        }

        if (failure != null && !(failure instanceof BusinessException) && !isCoveredByHttpRequestLogging()) {
            LOGGER.atError()
                    .addKeyValue("event", "UNEXPECTED_SERVICE_ERROR")
                    .addKeyValue("class", className)
                    .addKeyValue("method", methodName)
                    .addKeyValue("outcome", outcome)
                    .addKeyValue("elapsedMs", elapsedMillis)
                    .addKeyValue("errorCode", "INTERNAL_ERROR")
                    .addKeyValue("exception", failure.getClass().getSimpleName())
                    .setCause(failure)
                    .log("HTTP 요청 밖의 서비스 호출에서 예상하지 못한 오류가 발생했습니다.");
        }
    }

    private boolean isCoveredByHttpRequestLogging() {
        return RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes;
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
