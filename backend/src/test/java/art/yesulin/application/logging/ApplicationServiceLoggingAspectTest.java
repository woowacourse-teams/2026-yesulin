package art.yesulin.application.logging;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.infrastructure.logging.ApplicationServiceLoggingAspect;
import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.aop.aspectj.annotation.AspectJProxyFactory;
import org.springframework.stereotype.Service;

class ApplicationServiceLoggingAspectTest {

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
        logger.detachAppender(appender);
        logger.setLevel(previousLevel);
        appender.stop();
    }

    @Test
    void logsEveryApplicationServiceWithoutOptInAnnotation() {
        TestService service = createProxy();

        String result = service.succeed("sensitive-input");

        assertEquals("sensitive-result", result);
        List<String> messages = formattedMessages();
        assertEquals(1, messages.size());
        assertTrue(messages.getFirst().contains("class=TestService method=succeed outcome=SUCCESS"));
        assertFalse(messages.getFirst().contains("sensitive-input"));
        assertFalse(messages.getFirst().contains("sensitive-result"));
    }

    @Test
    void logsExceptionTypeWithoutExceptionMessageOrStackTrace() {
        TestService service = createProxy();

        assertThrows(IllegalStateException.class, () -> service.fail("sensitive-exception-message"));

        List<ILoggingEvent> events = appender.list;
        assertEquals(1, events.size());
        ILoggingEvent event = events.getFirst();
        assertEquals(Level.ERROR, event.getLevel());
        assertTrue(event.getFormattedMessage().contains("outcome=FAILURE exception=IllegalStateException"));
        assertFalse(event.getFormattedMessage().contains("sensitive-exception-message"));
        assertNull(event.getThrowableProxy());
    }

    @Test
    void logsAdminLogPollingSuccessAtDebugLevel() {
        AdminLogService service = createAdminLogProxy();

        service.findRecent();

        assertEquals(Level.DEBUG, appender.list.getFirst().getLevel());
        assertTrue(appender.list.getFirst().getFormattedMessage().contains("class=AdminLogService"));
    }

    @Test
    void keepsAdminLogPollingFailureAtErrorLevel() {
        AdminLogService service = createAdminLogProxy();

        assertThrows(IllegalStateException.class, service::fail);

        assertEquals(Level.ERROR, appender.list.getFirst().getLevel());
    }

    private AdminLogService createAdminLogProxy() {
        AspectJProxyFactory factory = new AspectJProxyFactory(new AdminLogService());
        factory.addAspect(new ApplicationServiceLoggingAspect());
        return factory.getProxy();
    }

    private TestService createProxy() {
        AspectJProxyFactory factory = new AspectJProxyFactory(new TestService());
        factory.addAspect(new ApplicationServiceLoggingAspect());
        return factory.getProxy();
    }

    private List<String> formattedMessages() {
        return appender.list.stream()
                .map(ILoggingEvent::getFormattedMessage)
                .toList();
    }

    /** 실제 운영 대시보드 조회 서비스와 같은 이름이어야 폴링 제외 규칙이 적용된다. */
    @Service
    static class AdminLogService {

        public String findRecent() {
            return "lines";
        }

        public void fail() {
            throw new IllegalStateException("boom");
        }
    }

    @Service
    static class TestService {

        public String succeed(String input) {
            return "sensitive-result";
        }

        public void fail(String message) {
            throw new IllegalStateException(message);
        }
    }
}
