package art.yesulin.legacy.infrastructure.notification;

import art.yesulin.legacy.application.auditionnotice.SmsGateway;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

public class SolapiSmsGateway implements SmsGateway {

    private static final Set<String> UNCERTAIN_CODES = Set.of("1024", "2024", "3014", "3048");

    private final String key;
    private final String secret;
    private final boolean enabled;
    private final ObjectMapper mapper;
    private final HttpClient client;
    private final URI base;

    public SolapiSmsGateway(String key, String secret, boolean enabled, ObjectMapper mapper) {
        this(key, secret, enabled, mapper, HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5)).build(), URI.create("https://api.solapi.com/"));
    }

    SolapiSmsGateway(String key, String secret, boolean enabled, ObjectMapper mapper, HttpClient client, URI base) {
        if (enabled && (key.isBlank() || secret.isBlank())) {
            throw new IllegalArgumentException("SMS_ENABLED에는 SOLAPI_API_KEY와 SOLAPI_API_SECRET이 필요합니다.");
        }
        this.key = key;
        this.secret = secret;
        this.enabled = enabled;
        this.mapper = mapper;
        this.client = client;
        this.base = base;
    }

    @Override
    public Outcome send(String sender, String phone, String body, String type) {
        if (!enabled) {
            return new Outcome("FAILED", null, "DISABLED_NOT_SENT");
        }
        try {
            Map<String, Object> message = new HashMap<>(Map.of("from", sender, "to", phone, "text", body,
                    "type", type, "country", "82", "autoTypeDetect", false));
            if ("LMS".equals(type)) {
                // 제목 생략 시 본문 앞부분이 제목으로 생성되므로 LMS에만 공백 제목을 명시한다.
                message.put("subject", " ");
            }
            String payload = mapper.writeValueAsString(Map.of("messages", List.of(message),
                    "showMessageList", true));
            HttpRequest request = request("messages/v4/send-many/detail")
                    .POST(HttpRequest.BodyPublishers.ofString(payload, StandardCharsets.UTF_8)).build();
            JsonNode result = execute(request);
            JsonNode accepted = result.path("messageList");
            JsonNode failed = result.path("failedMessageList");
            if (accepted.isArray() && accepted.size() == 1 && failed.isEmpty()) {
                JsonNode item = accepted.get(0);
                String id = validId(item.path("messageId").asText(""));
                return id == null ? Outcome.unknown(null) : outcome(item.path("statusCode").asText(""), id);
            }
            if (failed.isArray() && failed.size() == 1 && accepted.isEmpty()) {
                JsonNode item = failed.get(0);
                if (phone.equals(item.path("to").asText(""))) {
                    String code = item.path("statusCode").asText("");
                    String id = validId(item.path("messageId").asText(""));
                    return isFailure(code) ? new Outcome("FAILED", id, "SOLAPI_" + code) : Outcome.unknown(id);
                }
            }
            return Outcome.unknown(null);
        } catch (ProviderHttpException exception) {
            // 인증/접근 거절은 접수되지 않은 요청이다. 타임아웃·5xx와 구분하되 자동 재발송하지 않는다.
            if (exception.status == 401 || exception.status == 403) {
                return new Outcome("FAILED", null, "SOLAPI_HTTP_" + exception.status);
            }
            return Outcome.unknown(null);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return Outcome.unknown(null);
        } catch (Exception exception) {
            return Outcome.unknown(null);
        }
    }

    @Override
    public Outcome lookup(String providerId, String phone) {
        if (!enabled || validId(providerId) == null) {
            return Outcome.unknown(providerId);
        }
        try {
            JsonNode result = execute(request("messages/v4/list?criteria=messageId&cond=eq&value="
                    + providerId + "&limit=1").GET().build());
            JsonNode item = result.path("messageList").path(providerId);
            if (!providerId.equals(item.path("messageId").asText(""))
                    || !phone.equals(item.path("to").asText("").replace("-", ""))) {
                return Outcome.unknown(providerId);
            }
            return outcome(item.path("statusCode").asText(""), providerId);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return Outcome.unknown(providerId);
        } catch (Exception exception) {
            return Outcome.unknown(providerId);
        }
    }

    private Outcome outcome(String code, String id) {
        if (code.equals("4000")) {
            return new Outcome("DELIVERED", id, "SOLAPI_" + code);
        }
        if (code.equals("2000") || code.equals("3000")) {
            return new Outcome("ACCEPTED", id, "SOLAPI_" + code);
        }
        if (isFailure(code)) {
            return new Outcome("FAILED", id, "SOLAPI_" + code);
        }
        return Outcome.unknown(id);
    }

    private boolean isFailure(String code) {
        return code.matches("[123][0-9]{3}") && !code.equals("2000") && !code.equals("3000")
                && !UNCERTAIN_CODES.contains(code);
    }

    private String validId(String id) {
        // 공급자 접두사와 함께 기존 provider_id VARCHAR(40)에 저장한다.
        return id != null && id.matches("M[A-Za-z0-9]{1,32}") ? id : null;
    }

    private HttpRequest.Builder request(String path) throws GeneralSecurityException {
        String date = Instant.now().toString();
        String salt = UUID.randomUUID().toString().replace("-", "");
        Mac hmac = Mac.getInstance("HmacSHA256");
        hmac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        String signature = HexFormat.of().formatHex(hmac.doFinal((date + salt).getBytes(StandardCharsets.UTF_8)));
        String authorization = "HMAC-SHA256 apiKey=" + key + ", date=" + date
                + ", salt=" + salt + ", signature=" + signature;
        return HttpRequest.newBuilder(base.resolve(path)).timeout(Duration.ofSeconds(15))
                .header("Authorization", authorization).header("Content-Type", "application/json; charset=UTF-8");
    }

    private JsonNode execute(HttpRequest request) throws Exception {
        HttpResponse<String> response = client.send(request,
                HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new ProviderHttpException(response.statusCode());
        }
        return mapper.readTree(response.body());
    }

    private static class ProviderHttpException extends Exception {
        private final int status;

        ProviderHttpException(int status) {
            this.status = status;
        }
    }
}
