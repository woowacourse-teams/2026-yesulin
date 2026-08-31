package art.yesulin.presentation.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.mock.http.MockHttpInputMessage;

class ApiExceptionHandlerLogSafetyTest {

    private static final String SECRET = "fake-secret-for-log-safety-test";
    private final ApiExceptionHandler handler = new ApiExceptionHandler();
    private final Logger logger = (Logger) LoggerFactory.getLogger(ApiExceptionHandler.class);
    private final ListAppender<ILoggingEvent> appender = new ListAppender<>();
    private Level previousLevel;
    private boolean previousAdditive;

    @BeforeEach
    void setUp() {
        previousLevel = logger.getLevel();
        previousAdditive = logger.isAdditive();
        logger.setLevel(Level.DEBUG);
        logger.setAdditive(false);
        appender.start();
        logger.addAppender(appender);
    }

    @AfterEach
    void tearDown() {
        logger.detachAppender(appender);
        logger.setLevel(previousLevel);
        logger.setAdditive(previousAdditive);
        appender.stop();
    }

    @Test
    void malformedJsonDoesNotLogInputOrExceptionCause() {
        HttpMessageNotReadableException exception = new HttpMessageNotReadableException(
                SECRET, new IllegalArgumentException(SECRET), new MockHttpInputMessage(new byte[0])
        );

        assertEquals(HttpStatus.BAD_REQUEST, handler.handleHttpMessageNotReadableException(exception).getStatusCode());

        assertSanitizedLog();
    }

    @Test
    void invalidArgumentDoesNotLogInputOrExceptionCause() {
        IllegalArgumentException exception = new IllegalArgumentException(SECRET);

        assertEquals(HttpStatus.BAD_REQUEST, handler.handleIllegalArgumentException(exception).getStatusCode());

        assertSanitizedLog();
    }

    private void assertSanitizedLog() {
        assertEquals(1, appender.list.size());
        ILoggingEvent event = appender.list.getFirst();
        assertFalse(event.getFormattedMessage().contains(SECRET));
        assertNull(event.getThrowableProxy());
        assertNull(event.getArgumentArray());
    }
}
