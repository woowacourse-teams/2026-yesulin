package art.yesulin.infrastructure.logging;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.support.ObjectStorageTestConfiguration;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:structured-file-log;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false",
        "logging.file.name=build/tmp/structured-file-test.log"
})
@Import(ObjectStorageTestConfiguration.class)
class StructuredFileLoggingTest {

    private static final Logger LOGGER = LoggerFactory.getLogger(StructuredFileLoggingTest.class);
    private static final Path LOG_FILE = Path.of("build/tmp/structured-file-test.log");
    private static final String MARKER = "structured-file-json-lines-marker-" + UUID.randomUUID();

    private final ObjectMapper objectMapper;

    @Autowired
    StructuredFileLoggingTest(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Test
    void writesFileAsOneJsonObjectPerEventWhileKeepingMdcFields() throws IOException {
        MDC.put("requestId", "structured-file-request");
        try {
            LOGGER.atInfo()
                    .addKeyValue("event", "HTTP_REQUEST")
                    .addKeyValue("endpoint", "/api/v1/tests/{id}")
                    .addKeyValue("errorCode", "INVALID_REQUEST")
                    .log(MARKER);
        } finally {
            MDC.remove("requestId");
        }

        List<String> matched = Files.readAllLines(LOG_FILE, StandardCharsets.UTF_8).stream()
                .filter(line -> line.contains(MARKER))
                .toList();

        assertTrue(!matched.isEmpty());
        JsonNode event = objectMapper.readTree(matched.getLast());
        assertTrue(event.isObject());
        assertNotNull(event.get("@timestamp"));
        assertEquals("INFO", event.get("level").asString());
        assertEquals(MARKER, event.get("message").asString());
        assertEquals("structured-file-request", event.get("requestId").asString());
        assertEquals("HTTP_REQUEST", event.get("event").asString());
        assertEquals("/api/v1/tests/{id}", event.get("endpoint").asString());
        assertEquals("INVALID_REQUEST", event.get("errorCode").asString());
    }
}
