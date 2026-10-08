package art.yesulin.dormant.infrastructure.notification;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.dormant.application.auditionnotice.SmsGateway;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Collectors;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class SolapiSmsGatewayTest {

    private static final String ID = "M4V20260302143506CQKNPHTPCX4P5E";
    private static final String PHONE = "01012345678";

    private HttpServer server;
    private SolapiSmsGateway gateway;
    private final JsonMapper mapper = JsonMapper.builder().build();
    private final AtomicReference<String> response = new AtomicReference<>("{}");
    private final AtomicReference<String> payload = new AtomicReference<>("");
    private final AtomicReference<String> authorization = new AtomicReference<>("");
    private final AtomicReference<String> path = new AtomicReference<>("");
    private final AtomicInteger status = new AtomicInteger(200);
    private final AtomicInteger calls = new AtomicInteger();

    @BeforeEach
    void setUp() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            calls.incrementAndGet();
            payload.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            authorization.set(exchange.getRequestHeaders().getFirst("Authorization"));
            path.set(exchange.getRequestURI().toString());
            byte[] bytes = response.get().getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(status.get(), bytes.length);
            exchange.getResponseBody().write(bytes);
            exchange.close();
        });
        server.start();
        gateway = new SolapiSmsGateway("fake-key", "fake-secret", true, mapper, HttpClient.newHttpClient(),
                URI.create("http://127.0.0.1:" + server.getAddress().getPort() + "/"));
    }

    @AfterEach
    void stop() {
        server.stop(0);
    }

    @Test
    void signsJsonRequestAndKeepsRecipientBodyAndType() throws Exception {
        response.set("{\"messageList\":[{\"messageId\":\"" + ID + "\",\"statusCode\":\"2000\"}]}");
        SmsGateway.Outcome result = gateway.send("0212345678", PHONE, "홍길동님\n오디션 안내", "LMS");
        assertEquals(new SmsGateway.Outcome("ACCEPTED", ID, "SOLAPI_2000"), result);
        assertEquals("/messages/v4/send-many/detail", path.get());
        JsonNode body = mapper.readTree(payload.get());
        assertTrue(body.path("showMessageList").asBoolean());
        assertEquals(1, body.path("messages").size());
        JsonNode message = body.path("messages").get(0);
        assertEquals(PHONE, message.path("to").asText());
        assertEquals("0212345678", message.path("from").asText());
        assertEquals("홍길동님\n오디션 안내", message.path("text").asText());
        assertEquals("LMS", message.path("type").asText());
        assertEquals(" ", message.path("subject").asText());
        assertFalse(message.has("title"));
        assertFalse(message.has("message"));
        assertFalse(message.path("autoTypeDetect").asBoolean());
        assertFalse(payload.get().contains("fake-secret"));
        Map<String, String> fields = Arrays.stream(authorization.get().replace("HMAC-SHA256 ", "").split(", "))
                .map(value -> value.split("=", 2)).collect(Collectors.toMap(value -> value[0], value -> value[1]));
        Mac hmac = Mac.getInstance("HmacSHA256");
        hmac.init(new SecretKeySpec("fake-secret".getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        assertEquals("fake-key", fields.get("apiKey"));
        assertEquals(HexFormat.of().formatHex(hmac.doFinal((fields.get("date") + fields.get("salt"))
                .getBytes(StandardCharsets.UTF_8))), fields.get("signature"));
        String first = authorization.get();
        gateway.send("0212345678", PHONE, "안내", "SMS");
        assertNotEquals(first, authorization.get());
        assertFalse(mapper.readTree(payload.get()).path("messages").get(0).has("subject"));
    }

    @Test
    void onlyMatchingExplicitRejectionBecomesRetryableFailure() {
        response.set("{\"failedMessageList\":[{\"to\":\"" + PHONE + "\",\"statusCode\":\"1062\"}]}");
        assertEquals("FAILED", gateway.send("02", PHONE, "안내", "SMS").status());
        assertEquals("UNKNOWN", gateway.send("02", "01099999999", "안내", "SMS").status());
    }

    @ParameterizedTest
    @ValueSource(strings = {"not-json", "{}", "{\"groupInfo\":{\"groupId\":\"G123\"}}",
            "{\"messageList\":[{\"statusCode\":\"2000\"}]}",
            "{\"messageList\":[{\"messageId\":\"bad/id\",\"statusCode\":\"2000\"}]}",
            "{\"messageList\":[{\"messageId\":\"M1\",\"statusCode\":\"2000\"}],"
                    + "\"failedMessageList\":[{\"to\":\"01012345678\",\"statusCode\":\"1062\"}]}"})
    void ambiguousResponsesRemainUnknownWithoutResending(String body) {
        response.set(body);
        assertEquals("UNKNOWN", gateway.send("02", PHONE, "안내", "SMS").status());
        assertEquals(1, calls.get());
    }

    @ParameterizedTest
    @ValueSource(ints = {400, 429, 500, 503})
    void httpErrorsNeverTriggerAnotherSend(int httpStatus) {
        status.set(httpStatus);
        assertEquals("UNKNOWN", gateway.send("02", PHONE, "안내", "SMS").status());
        assertEquals(1, calls.get());
    }

    @ParameterizedTest
    @ValueSource(ints = {401, 403})
    void authenticationRejectionsAreVisibleWithoutAutomaticResending(int httpStatus) {
        status.set(httpStatus);
        assertEquals(new SmsGateway.Outcome("FAILED", null, "SOLAPI_HTTP_" + httpStatus),
                gateway.send("02", PHONE, "안내", "SMS"));
        assertEquals(1, calls.get());
        assertEquals("UNKNOWN", gateway.lookup(ID, PHONE).status());
    }

    @ParameterizedTest
    @ValueSource(strings = {"2000", "3000"})
    void pendingResultsAreNotDelivered(String code) {
        lookupResponse(code);
        assertEquals("ACCEPTED", gateway.lookup(ID, PHONE).status());
        assertEquals("/messages/v4/list?criteria=messageId&cond=eq&value=" + ID + "&limit=1", path.get());
    }

    @Test
    void deliveredAndFailedResultsRequireMatchingMessageAndPhone() {
        lookupResponse("4000");
        assertEquals("DELIVERED", gateway.lookup(ID, PHONE).status());
        assertEquals("UNKNOWN", gateway.lookup(ID, "01099999999").status());
        assertEquals("UNKNOWN", gateway.lookup("M999", PHONE).status());
        lookupResponse("3032");
        assertEquals("FAILED", gateway.lookup(ID, PHONE).status());
    }

    @ParameterizedTest
    @ValueSource(strings = {"1024", "2024", "3014", "3048", "9999", ""})
    void uncertainProviderStatesRemainUnknown(String code) {
        lookupResponse(code);
        assertEquals("UNKNOWN", gateway.lookup(ID, PHONE).status());
    }

    @Test
    void disabledAndInvalidLookupsDoNotContactProvider() {
        SolapiSmsGateway disabled = new SolapiSmsGateway("", "", false, mapper);
        assertEquals("FAILED", disabled.send("02", PHONE, "안내", "SMS").status());
        assertEquals("UNKNOWN", disabled.lookup(ID, PHONE).status());
        assertEquals("UNKNOWN", gateway.lookup("M1&to=010", PHONE).status());
        assertEquals(0, calls.get());
        assertThrows(IllegalArgumentException.class, () -> new SolapiSmsGateway("", "", true, mapper));
    }

    private void lookupResponse(String code) {
        response.set("{\"messageList\":{\"" + ID + "\":{\"messageId\":\"" + ID
                + "\",\"to\":\"" + PHONE + "\",\"statusCode\":\"" + code + "\"}}}");
    }
}
