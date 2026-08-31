package art.yesulin.presentation.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import art.yesulin.application.auth.AuthErrorCode;
import art.yesulin.common.exception.BusinessException;
import art.yesulin.presentation.config.RequestLoggingFilter;
import art.yesulin.support.ObjectStorageTestConfiguration;
import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import jakarta.servlet.ServletException;
import java.util.Map;
import java.util.stream.Collectors;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:http-request-logging;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import({ObjectStorageTestConfiguration.class, HttpRequestLoggingIntegrationTest.FailureController.class})
@AutoConfigureMockMvc
class HttpRequestLoggingIntegrationTest {

    private final Logger logger = (Logger) LoggerFactory.getLogger(RequestLoggingFilter.class);
    private final ListAppender<ILoggingEvent> appender = new ListAppender<>() {
        @Override
        protected void append(ILoggingEvent event) {
            event.prepareForDeferredProcessing();
            super.append(event);
        }
    };

    @Autowired
    private MockMvc mockMvc;

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
    void businessExceptionLeavesOneInfoHttpLogWithEndpointAndErrorCode() throws Exception {
        mockMvc.perform(get("/api/v1/test-logging/business/10")
                        .header(RequestLoggingFilter.REQUEST_ID_HEADER, "business-request"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTH_INVALID_CREDENTIALS"));

        assertEquals(1, appender.list.size());
        ILoggingEvent event = appender.list.getFirst();
        assertEquals(Level.INFO, event.getLevel());
        assertEquals("HTTP_REQUEST", fields(event).get("event"));
        assertEquals("/api/v1/test-logging/business/{id}", fields(event).get("endpoint"));
        assertEquals("AUTH_INVALID_CREDENTIALS", fields(event).get("errorCode"));
        assertEquals("business-request", event.getMDCPropertyMap().get("requestId"));
        assertNull(event.getThrowableProxy());
    }

    @Test
    void inputErrorLeavesOneInfoHttpLogWithInvalidRequestCode() throws Exception {
        mockMvc.perform(get("/api/v1/test-logging/input")
                        .param("value", "not-a-number")
                        .header(RequestLoggingFilter.REQUEST_ID_HEADER, "input-request"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));

        assertEquals(1, appender.list.size());
        ILoggingEvent event = appender.list.getFirst();
        assertEquals(Level.INFO, event.getLevel());
        assertEquals("INVALID_REQUEST", fields(event).get("errorCode"));
        assertNull(event.getThrowableProxy());
    }

    @Test
    void unexpectedExceptionHasOneStackTraceAndOneFinalHttpLog() {
        assertThrows(ServletException.class, () -> mockMvc.perform(get("/api/v1/test-logging/unexpected")
                .header(RequestLoggingFilter.REQUEST_ID_HEADER, "unexpected-request")));

        assertEquals(2, appender.list.size());
        ILoggingEvent unexpected = eventNamed("UNEXPECTED_ERROR");
        assertEquals(Level.ERROR, unexpected.getLevel());
        assertNotNull(unexpected.getThrowableProxy());
        assertEquals("unexpected-request", unexpected.getMDCPropertyMap().get("requestId"));

        ILoggingEvent http = eventNamed("HTTP_REQUEST");
        assertEquals(Level.ERROR, http.getLevel());
        assertEquals(500, fields(http).get("status"));
        assertEquals("INTERNAL_ERROR", fields(http).get("errorCode"));
        assertNull(http.getThrowableProxy());
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

    @RestController
    @RequestMapping("/api/v1/test-logging")
    static class FailureController {

        @GetMapping("/business/{id}")
        public void business(@PathVariable long id) {
            throw new BusinessException(AuthErrorCode.INVALID_CREDENTIALS, "로그에 남기지 않을 사용자 오류");
        }

        @GetMapping("/input")
        public void input(@RequestParam int value) {
            // 정상 숫자는 테스트 대상이 아니다.
        }

        @GetMapping("/unexpected")
        public void unexpected() {
            throw new IllegalStateException("unexpected-test-failure");
        }
    }
}
