package art.yesulin.legacy.infrastructure.notification;

import art.yesulin.legacy.application.auditionnotice.SmsGateway;
import java.util.Map;

public class RoutingSmsGateway implements SmsGateway {

    private final String provider;
    private final Map<String, SmsGateway> gateways;

    public RoutingSmsGateway(String provider, Map<String, SmsGateway> gateways) {
        if (!gateways.containsKey(provider)) {
            throw new IllegalArgumentException("SMS_PROVIDER는 solapi 또는 aligo여야 합니다.");
        }
        this.provider = provider;
        this.gateways = Map.copyOf(gateways);
    }

    @Override
    public Outcome send(String sender, String phone, String body, String type) {
        Outcome outcome = gateways.get(provider).send(sender, phone, body, type);
        String reference = outcome.providerId() == null ? null : provider + ":" + outcome.providerId();
        return new Outcome(outcome.status(), reference, outcome.code());
    }

    @Override
    public Outcome lookup(String providerId, String phone) {
        if (providerId == null) {
            return Outcome.unknown(null);
        }
        // 공급자 구분이 도입되기 전 숫자 ID는 알리고 발송 기록이다.
        String origin = "aligo";
        String id = providerId;
        int separator = providerId.indexOf(':');
        if (separator >= 0) {
            origin = providerId.substring(0, separator);
            id = providerId.substring(separator + 1);
        } else if (!providerId.matches("[0-9]+")) {
            return Outcome.unknown(providerId);
        }
        SmsGateway gateway = gateways.get(origin);
        if (gateway == null || id.isBlank()) {
            return Outcome.unknown(providerId);
        }
        Outcome outcome = gateway.lookup(id, phone);
        return new Outcome(outcome.status(), providerId, outcome.code());
    }
}
