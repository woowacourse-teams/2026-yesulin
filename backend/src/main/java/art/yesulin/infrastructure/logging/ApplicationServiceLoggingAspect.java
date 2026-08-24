package art.yesulin.infrastructure.logging;

import java.util.concurrent.TimeUnit;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Aspect
@Component
public class ApplicationServiceLoggingAspect {

    private static final Logger LOGGER = LoggerFactory.getLogger(ApplicationServiceLoggingAspect.class);

    @Around("execution(public * art.yesulin.application..*(..)) "
            + "&& @within(org.springframework.stereotype.Service)")
    public Object logExecution(ProceedingJoinPoint joinPoint) throws Throwable {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        String className = signature.getDeclaringType().getSimpleName();
        String methodName = signature.getName();
        long startNanos = System.nanoTime();

        try {
            Object result = joinPoint.proceed();
            logOutcome(className, methodName, "SUCCESS", null, startNanos);
            return result;
        } catch (Throwable throwable) {
            logOutcome(className, methodName, "FAILURE", throwable.getClass().getSimpleName(), startNanos);
            throw throwable;
        }
    }

    private void logOutcome(
            String className,
            String methodName,
            String outcome,
            String exceptionType,
            long startNanos
    ) {
        long elapsedMillis = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startNanos);
        if (exceptionType == null) {
            LOGGER.info(
                    "APPLICATION class={} method={} outcome={} elapsedMs={}",
                    className,
                    methodName,
                    outcome,
                    elapsedMillis
            );
            return;
        }
        LOGGER.error(
                "APPLICATION class={} method={} outcome={} exception={} elapsedMs={}",
                className,
                methodName,
                outcome,
                exceptionType,
                elapsedMillis
        );
    }
}
