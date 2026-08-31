package art.yesulin.presentation.api.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.application.admin.AdminDeletionConfirmation;
import art.yesulin.presentation.api.ErrorResponse;
import art.yesulin.support.ObjectStorageTestConfiguration;
import at.favre.lib.crypto.bcrypt.BCrypt;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.HttpCookie;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "server.address=127.0.0.1",
        "server.servlet.session.cookie.secure=false",
        "spring.datasource.url=jdbc:h2:mem:admin-rate-limit-http;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false",
        "yesulin.admin.accounts=rate-limit-admin@example.test:fake-login-password"
})
@Import(ObjectStorageTestConfiguration.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class AdminDeletionRateLimitHttpTest {

    private static final String PASSWORD = "fake-deletion-password";
    private static final String WRONG_PASSWORD = "fake-wrong-password";
    private static final String HASH = BCrypt.withDefaults().hashToString(4, PASSWORD.toCharArray());
    private final CookieManager cookies = new CookieManager(null, CookiePolicy.ACCEPT_ALL);

    @Value("${local.server.port}")
    private int port;
    @Autowired
    private ObjectMapper objectMapper;

    @DynamicPropertySource
    static void deletionPassword(DynamicPropertyRegistry registry) {
        registry.add("yesulin.admin.deletion-password-hash", () -> HASH);
    }

    @Test
    void locksAcrossTransactionsSessionsAndTargetsWhileKeepingReadsAvailableAndLogsSafe() throws Exception {
        Logger logger = (Logger) LoggerFactory.getLogger(AdminDeletionConfirmation.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try (HttpClient client = HttpClient.newBuilder().cookieHandler(cookies)
                .connectTimeout(Duration.ofSeconds(5)).version(HttpClient.Version.HTTP_1_1).build()) {
            login(client);
            // 없는 지원서로 요청해도 비밀번호 실패는 각 삭제 트랜잭션의 롤백 이후 누적되어야 한다.
            for (int attempt = 0; attempt < 4; attempt++) {
                assertConfirmationFailed(deleteSubmission(client, WRONG_PASSWORD));
            }
            assertEquals(204, send(client, "DELETE", "/api/v1/sessions/current", "").statusCode());
            cookies.getCookieStore().removeAll();
            login(client);

            HttpResponse<String> fifthFailure = deleteSubmission(client, WRONG_PASSWORD);
            HttpResponse<String> correctButLocked = deleteSubmission(client, PASSWORD);

            assertConfirmationFailed(fifthFailure);
            assertTrue(objectMapper.readValue(fifthFailure.body(), ErrorResponse.class).message().contains("잠겨"));
            assertConfirmationFailed(correctButLocked);
            assertTrue(objectMapper.readValue(correctButLocked.body(), ErrorResponse.class).message().contains("잠겨"));
            assertEquals(200, send(client, "GET", "/api/v1/admin/auditions", "").statusCode());
            assertEquals(200, send(client, "GET", "/api/v1/sessions/current", "").statusCode());
            assertEquals(6, appender.list.size());
            for (ILoggingEvent event : appender.list) {
                String message = event.getFormattedMessage();
                assertTrue(message.contains("actorMemberId="));
                assertFalse(message.contains(PASSWORD));
                assertFalse(message.contains(WRONG_PASSWORD));
                assertFalse(message.contains(HASH));
                assertNull(event.getThrowableProxy());
            }
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }
    }

    private void login(HttpClient client) throws Exception {
        assertEquals(200, send(client, "GET", "/api/v1/health", "").statusCode());
        String body = "{\"email\":\"rate-limit-admin@example.test\",\"password\":\"fake-login-password\"}";
        assertEquals(200, send(client, "POST", "/api/v1/sessions", body).statusCode());
    }

    private HttpResponse<String> deleteSubmission(HttpClient client, String password) throws Exception {
        String body = "{\"confirmationPassword\":\"%s\"}".formatted(password);
        return send(client, "DELETE", "/api/v1/admin/submissions/" + UUID.randomUUID(), body);
    }

    private void assertConfirmationFailed(HttpResponse<String> response) {
        assertEquals(403, response.statusCode());
        assertEquals("ADMIN_DELETION_CONFIRMATION_FAILED",
                objectMapper.readValue(response.body(), ErrorResponse.class).code());
    }

    private HttpResponse<String> send(HttpClient client, String method, String path, String body) throws Exception {
        HttpRequest.Builder request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path))
                .timeout(Duration.ofSeconds(10))
                .header("Content-Type", "application/json")
                .method(method, HttpRequest.BodyPublishers.ofString(body));
        if (!method.equals("GET")) {
            String csrf = cookies.getCookieStore().getCookies().stream()
                    .filter(cookie -> cookie.getName().equals("XSRF-TOKEN"))
                    .map(HttpCookie::getValue).findFirst().orElseThrow();
            request.header("X-CSRF-Token", csrf);
        }
        return client.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }
}
