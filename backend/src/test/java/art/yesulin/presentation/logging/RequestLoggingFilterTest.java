package art.yesulin.presentation.logging;

import static art.yesulin.presentation.config.RequestLoggingFilter.REQUEST_ID_HEADER;
import static art.yesulin.presentation.config.RequestLoggingFilter.REQUEST_ID_MDC_KEY;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.presentation.config.RequestLoggingFilter;
import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class RequestLoggingFilterTest {

    private final RequestLoggingFilter filter = new RequestLoggingFilter();
    private final Logger logger = (Logger) LoggerFactory.getLogger(RequestLoggingFilter.class);
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
        MDC.clear();
    }

    @Test
    void correlatesRequestLogsWithValidatedRequestId() throws Exception {
        MockHttpServletRequest request = request();
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicReference<String> requestIdInChain = new AtomicReference<>();
        request.addHeader(REQUEST_ID_HEADER, "client-request_123");

        filter.doFilter(request, response, (servletRequest, servletResponse) -> {
            requestIdInChain.set(MDC.get(REQUEST_ID_MDC_KEY));
            ((MockHttpServletResponse) servletResponse).setStatus(201);
        });

        assertEquals("client-request_123", requestIdInChain.get());
        assertEquals("client-request_123", response.getHeader(REQUEST_ID_HEADER));
        assertNull(MDC.get(REQUEST_ID_MDC_KEY));
        ILoggingEvent event = appender.list.getFirst();
        assertEquals(Level.INFO, event.getLevel());
        assertEquals("client-request_123", event.getMDCPropertyMap().get(REQUEST_ID_MDC_KEY));
        String message = event.getFormattedMessage();
        assertTrue(message.contains("method=POST uri=/api/v1/submissions status=201"));
        assertFalse(message.contains("password"));
        assertFalse(message.contains("secret"));
    }

    @Test
    void logsSuccessfulHealthCheckAtDebugLevel() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/health");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, (servletRequest, servletResponse) -> {
        });

        ILoggingEvent event = appender.list.getFirst();
        assertEquals(Level.DEBUG, event.getLevel());
        assertTrue(event.getFormattedMessage().contains("uri=/api/v1/health status=200"));
    }

    @Test
    void logsUnhealthyHealthCheckAtErrorLevel() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/health");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, (servletRequest, servletResponse) -> {
            ((MockHttpServletResponse) servletResponse).setStatus(503);
        });

        ILoggingEvent event = appender.list.getFirst();
        assertEquals(Level.ERROR, event.getLevel());
        assertTrue(event.getFormattedMessage().contains("uri=/api/v1/health status=503"));
    }

    @Test
    void logsSuccessfulAdminLogPollingAtDebugLevel() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/admin/logs");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, (servletRequest, servletResponse) -> {
        });

        ILoggingEvent event = appender.list.getFirst();
        assertEquals(Level.DEBUG, event.getLevel());
        assertTrue(event.getFormattedMessage().contains("uri=/api/v1/admin/logs status=200"));
    }

    @Test
    void logsFailedAdminLogPollingAtErrorLevel() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/admin/logs");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, (servletRequest, servletResponse) -> {
            ((MockHttpServletResponse) servletResponse).setStatus(500);
        });

        ILoggingEvent event = appender.list.getFirst();
        assertEquals(Level.ERROR, event.getLevel());
    }

    /** 로그인 전 화면 진입에서 늘 생기는 응답이라 ERROR로 올리면 실제 장애가 묻힌다. */
    @Test
    void logsUnauthorizedAdminLogPollingAtInfoLevel() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/admin/logs");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, (servletRequest, servletResponse) -> {
            ((MockHttpServletResponse) servletResponse).setStatus(401);
        });

        ILoggingEvent event = appender.list.getFirst();
        assertEquals(Level.INFO, event.getLevel());
        assertTrue(event.getFormattedMessage().contains("uri=/api/v1/admin/logs status=401"));
    }

    @Test
    void keepsOtherAdminRequestsAtInfoLevel() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/admin/overview");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, (servletRequest, servletResponse) -> {
        });

        ILoggingEvent event = appender.list.getFirst();
        assertEquals(Level.INFO, event.getLevel());
    }

    @Test
    void replacesInvalidRequestIdWithFullUuid() throws Exception {
        MockHttpServletRequest request = request();
        MockHttpServletResponse response = new MockHttpServletResponse();
        request.addHeader(REQUEST_ID_HEADER, "invalid request id");

        filter.doFilter(request, response, (servletRequest, servletResponse) -> {
        });

        String requestId = response.getHeader(REQUEST_ID_HEADER);
        assertNotEquals("invalid request id", requestId);
        assertEquals(requestId, UUID.fromString(requestId).toString());
    }

    @Test
    void logsUnexpectedFailureWithoutItsMessage() {
        MockHttpServletRequest request = request();
        MockHttpServletResponse response = new MockHttpServletResponse();

        assertThrows(IllegalStateException.class, () -> filter.doFilter(
                request,
                response,
                (servletRequest, servletResponse) -> {
                    throw new IllegalStateException("sensitive-exception-message");
                }
        ));

        ILoggingEvent event = appender.list.getFirst();
        assertEquals(Level.ERROR, event.getLevel());
        assertTrue(event.getFormattedMessage().matches(
                "HTTP method=POST uri=/api/v1/submissions status=500 elapsedMs=\\d+"
        ));
        assertNull(event.getThrowableProxy());
        assertNull(MDC.get(REQUEST_ID_MDC_KEY));
    }

    private MockHttpServletRequest request() {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/submissions");
        request.setQueryString("password=secret");
        request.addHeader("Authorization", "Bearer secret");
        return request;
    }
}
