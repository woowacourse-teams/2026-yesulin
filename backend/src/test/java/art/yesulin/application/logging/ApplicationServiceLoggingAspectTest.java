package art.yesulin.application.logging;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.application.auth.AuthErrorCode;
import art.yesulin.common.exception.BusinessException;
import art.yesulin.infrastructure.logging.ApplicationServiceLoggingAspect;
import art.yesulin.infrastructure.logging.ServiceLoggingTimeSource;
import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.aop.aspectj.annotation.AspectJProxyFactory;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

class ApplicationServiceLoggingAspectTest {

    private static final String SECRET = "sensitive-service-value";

    private final Logger logger = (Logger) LoggerFactory.getLogger(ApplicationServiceLoggingAspect.class);
    private final ListAppender<ILoggingEvent> appender = new ListAppender<>();
    private Level previousLevel;

    @BeforeEach
    void setUp() {
        previousLevel = logger.getLevel();
        logger.setLevel(Level.DEBUG);
        appender.start();
        logger.addAppender(appender);
    }

    @AfterEach
    void tearDown() {
        RequestContextHolder.resetRequestAttributes();
        logger.detachAppender(appender);
        logger.setLevel(previousLevel);
        appender.stop();
    }

    @Test
    void logsFastSuccessAtDebugWithoutArgumentsOrResult() {
        TestService service = createProxy(499L);

        String result = service.succeed(SECRET);

        assertEquals("sensitive-result", result);
        ILoggingEvent event = appender.list.getFirst();
        assertEquals(Level.DEBUG, event.getLevel());
        assertEquals("SERVICE_CALL", fields(event).get("event"));
        assertEquals("TestService", fields(event).get("class"));
        assertEquals("succeed", fields(event).get("method"));
        assertEquals("SUCCESS", fields(event).get("outcome"));
        assertEquals(499L, fields(event).get("elapsedMs"));
        assertFalse(event.getFormattedMessage().contains(SECRET));
        assertFalse(event.getFormattedMessage().contains("sensitive-result"));
    }

    @Test
    void logsSuccessTakingExactlyFiveHundredMillisecondsAsSlowServiceWarn() {
        TestService service = createProxy(500L);

        service.succeed("input");

        ILoggingEvent event = appender.list.getFirst();
        assertEquals(Level.WARN, event.getLevel());
        assertEquals("SLOW_SERVICE", fields(event).get("event"));
        assertEquals("SUCCESS", fields(event).get("outcome"));
        assertEquals(500L, fields(event).get("elapsedMs"));
        assertNull(event.getThrowableProxy());
    }

    @Test
    void doesNotLogFastBusinessException() {
        TestService service = createProxy(499L);

        assertThrows(BusinessException.class, () -> service.reject(SECRET));

        assertTrue(appender.list.isEmpty());
    }

    @Test
    void logsSlowBusinessExceptionOnlyAsPerformanceWarning() {
        TestService service = createProxy(500L);

        assertThrows(BusinessException.class, () -> service.reject(SECRET));

        ILoggingEvent event = appender.list.getFirst();
        assertEquals(Level.WARN, event.getLevel());
        assertEquals("SLOW_SERVICE", fields(event).get("event"));
        assertEquals("FAILURE", fields(event).get("outcome"));
        assertNull(event.getThrowableProxy());
        assertFalse(event.getFormattedMessage().contains(SECRET));
        assertTrue(appender.list.stream().noneMatch(logEvent -> logEvent.getLevel() == Level.ERROR));
    }

    @Test
    void leavesFastUnexpectedExceptionLoggingToHttpBoundary() {
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(new MockHttpServletRequest()));
        TestService service = createProxy(499L);

        assertThrows(IllegalStateException.class, () -> service.fail(SECRET));

        assertTrue(appender.list.isEmpty());
    }

    @Test
    void logsFastUnexpectedExceptionOutsideHttpBoundaryAtError() {
        TestService service = createProxy(499L);

        assertThrows(IllegalStateException.class, () -> service.fail(SECRET));

        ILoggingEvent event = appender.list.getFirst();
        assertEquals(Level.ERROR, event.getLevel());
        assertEquals("UNEXPECTED_SERVICE_ERROR", fields(event).get("event"));
        assertEquals("TestService", fields(event).get("class"));
        assertEquals("fail", fields(event).get("method"));
        assertEquals("FAILURE", fields(event).get("outcome"));
        assertEquals("INTERNAL_ERROR", fields(event).get("errorCode"));
        assertEquals("IllegalStateException", fields(event).get("exception"));
        assertNotNull(event.getThrowableProxy());
        assertFalse(event.getFormattedMessage().contains(SECRET));
    }

    @Test
    void slowUnexpectedExceptionHasNoDuplicatedStackTrace() {
        TestService service = createProxy(500L);

        assertThrows(IllegalStateException.class, () -> service.fail(SECRET));

        ILoggingEvent event = appender.list.getFirst();
        assertEquals(Level.WARN, event.getLevel());
        assertEquals("SLOW_SERVICE", fields(event).get("event"));
        assertEquals("FAILURE", fields(event).get("outcome"));
        assertNull(event.getThrowableProxy());
        assertFalse(event.getFormattedMessage().contains(SECRET));
    }

    @Test
    void treatsAdminLogServiceLikeAnyOtherFastService() {
        AdminLogService service = createAdminLogProxy(0L);

        service.findRecent();

        ILoggingEvent event = appender.list.getFirst();
        assertEquals(Level.DEBUG, event.getLevel());
        assertEquals("SERVICE_CALL", fields(event).get("event"));
        assertEquals("AdminLogService", fields(event).get("class"));
    }

    private TestService createProxy(long elapsedMillis) {
        AspectJProxyFactory factory = new AspectJProxyFactory(new TestService());
        factory.addAspect(new ApplicationServiceLoggingAspect(timeSource(elapsedMillis)));
        return factory.getProxy();
    }

    private AdminLogService createAdminLogProxy(long elapsedMillis) {
        AspectJProxyFactory factory = new AspectJProxyFactory(new AdminLogService());
        factory.addAspect(new ApplicationServiceLoggingAspect(timeSource(elapsedMillis)));
        return factory.getProxy();
    }

    private ServiceLoggingTimeSource timeSource(long elapsedMillis) {
        long elapsedNanos = TimeUnit.MILLISECONDS.toNanos(elapsedMillis);
        return new ServiceLoggingTimeSource() {
            private int invocation;

            @Override
            public long nanoTime() {
                return invocation++ == 0 ? 0L : elapsedNanos;
            }
        };
    }

    private Map<String, Object> fields(ILoggingEvent event) {
        return event.getKeyValuePairs().stream()
                .collect(Collectors.toMap(pair -> pair.key, pair -> pair.value));
    }

    @Service
    static class AdminLogService {

        public String findRecent() {
            return "lines";
        }
    }

    @Service
    static class TestService {

        public String succeed(String input) {
            return "sensitive-result";
        }

        public void reject(String message) {
            throw new BusinessException(AuthErrorCode.INVALID_CREDENTIALS, message);
        }

        public void fail(String message) {
            throw new IllegalStateException(message);
        }
    }
}
