package art.yesulin.presentation.api.notice;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.head;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import art.yesulin.presentation.config.RequestLoggingFilter;
import art.yesulin.support.ObjectStorageTestConfiguration;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
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

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:notice-links;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@AutoConfigureMockMvc
@Import(ObjectStorageTestConfiguration.class)
class NoticeLinkControllerTest {

    private static final String LINK = "/api/v1/otr";
    private static final String DESTINATION = "https://otr.co.kr/audition/?vid=22310";

    private final Logger logger = (Logger) LoggerFactory.getLogger(RequestLoggingFilter.class);
    private final ListAppender<ILoggingEvent> appender = new ListAppender<>();

    @Autowired
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        appender.start();
        logger.addAppender(appender);
    }

    @AfterEach
    void tearDown() {
        logger.detachAppender(appender);
        appender.stop();
    }

    @Test
    void anonymousGetRedirectsAndLeavesExactlyOneCountableHttpLog() throws Exception {
        mockMvc.perform(get(LINK).param("vid", "22310"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", DESTINATION))
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(header().string("Referrer-Policy", "no-referrer"));

        assertThat(appender.list).hasSize(1);
        assertThat(fields(appender.list.getFirst()))
                .containsEntry("event", "HTTP_REQUEST")
                .containsEntry("method", "GET")
                .containsEntry("uri", LINK)
                .containsEntry("endpoint", LINK)
                .containsEntry("otrId", "22310")
                .containsEntry("status", 302);
    }

    @Test
    void headRedirectsButItsLogCanBeExcludedByMethod() throws Exception {
        mockMvc.perform(head(LINK).param("vid", "22310"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", DESTINATION));

        assertThat(appender.list).hasSize(1);
        assertThat(fields(appender.list.getFirst()))
                .containsEntry("method", "HEAD")
                .containsEntry("status", 302);
    }

    @Test
    void repeatedGetsLeaveSeparateRequestLogs() throws Exception {
        mockMvc.perform(get(LINK).param("vid", "22310")).andExpect(status().isFound());
        mockMvc.perform(get(LINK).param("vid", "22310")).andExpect(status().isFound());

        assertThat(appender.list).hasSize(2);
    }

    @Test
    void invalidIdIsRejectedAndCannotBeCountedAsRedirect() throws Exception {
        mockMvc.perform(get(LINK).param("vid", "invalid"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
                .andExpect(header().doesNotExist("Location"));

        assertThat(fields(appender.list.getFirst()))
                .containsEntry("status", 400)
                .doesNotContainKey("otrId");
    }

    @Test
    void requestCannotChooseAnotherDestination() throws Exception {
        mockMvc.perform(get(LINK).param("vid", "22310").param("url", "https://example.com"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", DESTINATION));

        assertThat(fields(appender.list.getFirst()))
                .containsEntry("uri", LINK)
                .containsEntry("otrId", "22310");
        assertThat(appender.list.getFirst().getFormattedMessage()).doesNotContain("example.com");
    }

    @Test
    void missingIdIsRejected() throws Exception {
        mockMvc.perform(get(LINK))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
                .andExpect(header().doesNotExist("Location"));
    }

    private Map<String, Object> fields(ILoggingEvent event) {
        return event.getKeyValuePairs().stream()
                .collect(Collectors.toMap(pair -> pair.key, pair -> pair.value));
    }
}
