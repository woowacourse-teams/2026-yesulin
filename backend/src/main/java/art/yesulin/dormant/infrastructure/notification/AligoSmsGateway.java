package art.yesulin.dormant.infrastructure.notification;

import art.yesulin.dormant.application.auditionnotice.SmsGateway;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

public class AligoSmsGateway implements SmsGateway {

    private final String userId;
    private final String key;
    private final boolean enabled;
    private final ObjectMapper mapper;
    private final HttpClient client;
    private final URI base;

    public AligoSmsGateway(String userId, String key, boolean enabled, ObjectMapper mapper) {
        this(userId, key, enabled, mapper, HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5)).build(), URI.create("https://apis.aligo.in/"));
    }

    AligoSmsGateway(String userId, String key, boolean enabled, ObjectMapper mapper, HttpClient client, URI base) {
        this.userId = userId;
        this.key = key;
        this.enabled = enabled;
        this.mapper = mapper;
        this.client = client;
        this.base = base;
        if (enabled && (userId.isBlank() || key.isBlank())) {
            throw new IllegalArgumentException("SMS_ENABLED에는 ALIGO_USER_ID와 ALIGO_API_KEY가 필요합니다.");
        }
    }

    @Override
    public Outcome send(String sender, String phone, String body, String type) {
        if (!enabled) {
            return new Outcome("FAILED", null, "DISABLED_NOT_SENT");
        }
        try {
            JsonNode result = post("send/", Map.of("sender", sender, "receiver", phone, "msg", body, "msg_type", type));
            if (result.path("result_code").asInt(0) < 0) {
                return new Outcome("FAILED", null, "ALIGO_" + result.path("result_code").asInt());
            }
            String id = result.path("msg_id").asText("");
            if (result.path("result_code").asInt(0) == 1 && id.matches("[0-9]+")
                    && result.path("success_cnt").asInt(0) == 1 && result.path("error_cnt").asInt(-1) == 0) {
                return new Outcome("ACCEPTED", id, null);
            }
            return Outcome.unknown(id.matches("[0-9]+") ? id : null);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return Outcome.unknown(null);
        } catch (Exception exception) {
            return Outcome.unknown(null);
        }
    }

    @Override
    public Outcome lookup(String providerId, String phone) {
        if (!enabled) {
            return Outcome.unknown(providerId);
        }
        try {
            JsonNode result = post("sms_list/", Map.of("mid", providerId, "page", "1", "page_size", "30"));
            if (result.path("result_code").asInt(0) != 1) {
                return Outcome.unknown(providerId);
            }
            for (JsonNode item : result.path("list")) {
                if (!item.path("receiver").asText().replace("-", "").equals(phone)) {
                    continue;
                }
                String state = item.path("sms_state").asText();
                if (state.equals("발송완료")) {
                    return new Outcome("DELIVERED", providerId, "DELIVERED");
                }
                if (state.equals("가입자없음")) {
                    return new Outcome("FAILED", providerId, "NO_SUBSCRIBER");
                }
            }
            return Outcome.unknown(providerId);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return Outcome.unknown(providerId);
        } catch (Exception exception) {
            return Outcome.unknown(providerId);
        }
    }

    private JsonNode post(String path, Map<String, String> data) throws Exception {
        Map<String, String> values = new LinkedHashMap<>(data);
        values.put("key", key);
        values.put("user_id", userId);
        String body = values.entrySet().stream().map(e -> encode(e.getKey()) + "=" + encode(e.getValue()))
                .collect(Collectors.joining("&"));
        HttpRequest request = HttpRequest.newBuilder(base.resolve(path)).timeout(Duration.ofSeconds(15))
                .header("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8")
                .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8)).build();
        HttpResponse<String> response = client.send(request,
                HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (response.statusCode() != 200) {
            throw new IllegalStateException("ALIGO_HTTP_ERROR");
        }
        return mapper.readTree(response.body());
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
