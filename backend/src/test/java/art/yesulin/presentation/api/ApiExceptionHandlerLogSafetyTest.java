package art.yesulin.presentation.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.application.auth.AuthErrorCode;
import art.yesulin.common.exception.BusinessException;
import art.yesulin.presentation.config.RequestLogContext;
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
import org.springframework.mock.web.MockHttpServletRequest;

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
        MockHttpServletRequest request = request();

        assertEquals(
                HttpStatus.BAD_REQUEST,
                handler.handleHttpMessageNotReadableException(exception, request).getStatusCode()
        );

        assertEquals("INVALID_REQUEST", RequestLogContext.getErrorCode(request));
        assertTrue(appender.list.isEmpty());
    }

    @Test
    void invalidArgumentDoesNotLogInputOrExceptionCause() {
        IllegalArgumentException exception = new IllegalArgumentException(SECRET);
        MockHttpServletRequest request = request();

        assertEquals(
                HttpStatus.BAD_REQUEST,
                handler.handleIllegalArgumentException(exception, request).getStatusCode()
        );

        assertEquals("INVALID_REQUEST", RequestLogContext.getErrorCode(request));
        assertTrue(appender.list.isEmpty());
    }

    @Test
    void businessExceptionSetsErrorCodeWithoutWritingServerError() {
        MockHttpServletRequest request = request();
        BusinessException exception = new BusinessException(AuthErrorCode.INVALID_CREDENTIALS, SECRET);

        assertEquals(HttpStatus.UNAUTHORIZED, handler.handleBusinessException(exception, request).getStatusCode());

        assertEquals("AUTH_INVALID_CREDENTIALS", RequestLogContext.getErrorCode(request));
        assertTrue(appender.list.isEmpty());
    }

    private MockHttpServletRequest request() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/tests/10");
        request.setQueryString("password=secret");
        request.addHeader("Authorization", "Bearer secret");
        return request;
    }
}
