package art.yesulin.presentation.logging;

import static art.yesulin.presentation.config.RequestLoggingFilter.REQUEST_ID_HEADER;
import static art.yesulin.presentation.config.RequestLoggingFilter.REQUEST_ID_MDC_KEY;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.presentation.config.MonotonicTimeSource;
import art.yesulin.presentation.config.RequestLogContext;
import art.yesulin.presentation.config.RequestLoggingFilter;
import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Collectors;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.servlet.HandlerMapping;

class RequestLoggingFilterTest {

    private RequestLoggingFilter filter;
    private final Logger logger = (Logger) LoggerFactory.getLogger(RequestLoggingFilter.class);
    private final ListAppender<ILoggingEvent> appender = new ListAppender<>();
    private Level previousLevel;

    @BeforeEach
    void setUp() {
        filter = filterWithElapsedMillis(0L);
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
        request.setAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE, "/api/v1/submissions");

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
        assertEquals("HTTP_REQUEST", fields(event).get("event"));
        assertEquals("/api/v1/submissions", fields(event).get("endpoint"));
        assertEquals(201, fields(event).get("status"));
        String message = event.getFormattedMessage();
        assertTrue(message.contains("method=POST uri=/api/v1/submissions endpoint=/api/v1/submissions status=201"));
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
        assertEquals("/api/v1/health", fields(event).get("endpoint"));
        assertEquals(200, fields(event).get("status"));
    }

    @Test
    void logsSuccessfulReadinessCheckAtDebugLevel() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/actuator/health/readiness");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, (servletRequest, servletResponse) -> {
        });

        ILoggingEvent event = appender.list.getFirst();
        assertEquals(Level.DEBUG, event.getLevel());
        assertEquals("/actuator/health/readiness", fields(event).get("endpoint"));
        assertEquals(200, fields(event).get("status"));
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
        assertEquals(503, fields(event).get("status"));
    }

    @Test
    void logsSuccessfulAdminLogPollingAtDebugLevel() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/admin/logs");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, (servletRequest, servletResponse) -> {
        });

        ILoggingEvent event = appender.list.getFirst();
        assertEquals(Level.DEBUG, event.getLevel());
        assertEquals(200, fields(event).get("status"));
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
        assertEquals(401, fields(event).get("status"));
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
    void logsRequestsTakingAtLeastOneSecondAtWarnLevel() throws Exception {
        RequestLoggingFilter slowFilter = filterWithElapsedMillis(1_000L);
        MockHttpServletRequest request = request();
        MockHttpServletResponse response = new MockHttpServletResponse();

        slowFilter.doFilter(request, response, (servletRequest, servletResponse) -> {
        });

        assertEquals(1, appender.list.size());
        ILoggingEvent event = appender.list.getFirst();
        assertEquals(Level.WARN, event.getLevel());
        assertEquals(1_000L, fields(event).get("elapsedMs"));
    }

    @Test
    void includesExpectedErrorCodeWithoutRaisingClientErrorToErrorLevel() throws Exception {
        MockHttpServletRequest request = request();
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, (servletRequest, servletResponse) -> {
            RequestLogContext.setErrorCode(request, "SUBMISSION_ALREADY_EXISTS");
            response.setStatus(409);
        });

        assertEquals(1, appender.list.size());
        ILoggingEvent event = appender.list.getFirst();
        assertEquals(Level.INFO, event.getLevel());
        assertEquals("SUBMISSION_ALREADY_EXISTS", fields(event).get("errorCode"));
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
    void logsUnexpectedFailureOnceWithStackTraceAndOneFinalHttpEvent() {
        MockHttpServletRequest request = request();
        MockHttpServletResponse response = new MockHttpServletResponse();

        assertThrows(IllegalStateException.class, () -> filter.doFilter(
                request,
                response,
                (servletRequest, servletResponse) -> {
                    throw new IllegalStateException("sensitive-exception-message");
                }
        ));

        assertEquals(2, appender.list.size());
        ILoggingEvent unexpected = eventNamed("UNEXPECTED_ERROR");
        assertEquals(Level.ERROR, unexpected.getLevel());
        assertNotNull(unexpected.getThrowableProxy());
        assertEquals("IllegalStateException", fields(unexpected).get("exception"));
        assertEquals("INTERNAL_ERROR", fields(unexpected).get("errorCode"));
        assertFalse(unexpected.getFormattedMessage().contains("sensitive-exception-message"));

        ILoggingEvent http = eventNamed("HTTP_REQUEST");
        assertEquals(Level.ERROR, http.getLevel());
        assertEquals(500, fields(http).get("status"));
        assertEquals("INTERNAL_ERROR", fields(http).get("errorCode"));
        assertNull(http.getThrowableProxy());
        assertEquals(
                1L,
                appender.list.stream().filter(event -> "HTTP_REQUEST".equals(fields(event).get("event"))).count()
        );
        assertNull(MDC.get(REQUEST_ID_MDC_KEY));
    }

    private ILoggingEvent eventNamed(String name) {
        return appender.list.stream()
                .filter(event -> name.equals(fields(event).get("event")))
                .findFirst()
                .orElseThrow();
    }

    private Map<String, Object> fields(ILoggingEvent event) {
        return event.getKeyValuePairs().stream()
                .collect(Collectors.toMap(pair -> pair.key, pair -> pair.value));
    }

    private RequestLoggingFilter filterWithElapsedMillis(long elapsedMillis) {
        long elapsedNanos = TimeUnit.MILLISECONDS.toNanos(elapsedMillis);
        MonotonicTimeSource timeSource = new MonotonicTimeSource() {
            private int invocation;

            @Override
            public long nanoTime() {
                return invocation++ == 0 ? 0L : elapsedNanos;
            }
        };
        return new RequestLoggingFilter(timeSource);
    }

    private MockHttpServletRequest request() {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/submissions");
        request.setQueryString("password=secret");
        request.addHeader("Authorization", "Bearer secret");
        return request;
    }
}
