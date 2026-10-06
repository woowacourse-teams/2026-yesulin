package art.yesulin.legacy.infrastructure.notification;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class AligoSmsGatewayTest {

    private HttpServer server;
    private AligoSmsGateway gateway;
    private final AtomicReference<String> response = new AtomicReference<>("{}");
    private final AtomicReference<String> request = new AtomicReference<>("");
    private final AtomicInteger calls = new AtomicInteger();

    @BeforeEach
    void setUp() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            calls.incrementAndGet();
            request.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            byte[] bytes = response.get().getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, bytes.length);
            exchange.getResponseBody().write(bytes);
            exchange.close();
        });
        server.start();
        gateway = new AligoSmsGateway("fake-user", "fake-key", true, JsonMapper.builder().build(),
                HttpClient.newHttpClient(), URI.create("http://127.0.0.1:" + server.getAddress().getPort() + "/"));
    }

    @AfterEach
    void stop() {
        server.stop(0);
    }

    @Test
    void sendsFormEncodedAndDistinguishesProviderAcceptance() {
        response.set("{\"result_code\":1,\"msg_id\":123,\"success_cnt\":1,\"error_cnt\":0}");
        assertEquals("ACCEPTED", gateway.send("0212345678", "01012345678", "안내", "LMS").status());
        assertTrue(request.get().contains("user_id=fake-user"));
        assertTrue(request.get().contains("msg=%EC%95%88%EB%82%B4"));
        assertTrue(request.get().contains("msg_type=LMS"));
    }

    @Test
    void malformedAndAmbiguousResponsesNeverBecomeRetryableFailures() {
        response.set("not-json");
        assertEquals("UNKNOWN", gateway.send("02", "010", "text", "SMS").status());
        response.set("{\"result_code\":1,\"success_cnt\":0,\"error_cnt\":1}");
        assertEquals("UNKNOWN", gateway.send("02", "010", "text", "SMS").status());
        response.set("{\"result_code\":-101}");
        assertEquals("FAILED", gateway.send("02", "010", "text", "SMS").status());
        assertEquals(3, calls.get());
    }

    @Test
    void mapsOnlyDocumentedDefinitiveStatesForMatchingPhone() {
        response.set("""
                {"result_code":1,"list":[{"receiver":"01012345678","sms_state":"발송완료"}]}
                """);
        assertEquals("DELIVERED", gateway.lookup("123", "01012345678").status());
        assertEquals("UNKNOWN", gateway.lookup("123", "01099999999").status());
        response.set("""
                {"result_code":1,"list":[{"receiver":"01012345678","sms_state":"가입자없음"}]}
                """);
        assertEquals("FAILED", gateway.lookup("123", "01012345678").status());
        response.set("{\"result_code\":1,\"list\":[]}");
        assertEquals("UNKNOWN", gateway.lookup("123", "01012345678").status());
    }

    @Test
    void disabledAdapterMakesNoHttpRequest() {
        AligoSmsGateway disabled = new AligoSmsGateway("", "", false, JsonMapper.builder().build());
        assertEquals("FAILED", disabled.send("02", "010", "text", "SMS").status());
        assertEquals(0, calls.get());
    }
}
