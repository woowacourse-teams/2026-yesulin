package art.yesulin.legacy.application.auditionnotice;

public interface SmsGateway {

    Outcome send(String sender, String phone, String body, String type);

    Outcome lookup(String providerId, String phone);

    record Outcome(String status, String providerId, String code) {

        public static Outcome unknown(String providerId) {
            return new Outcome("UNKNOWN", providerId, "RECONCILIATION_REQUIRED");
        }
    }
}
