package art.yesulin.application.account;

public record ProducerRegistrationResult(
        long accountId, long companyId, String email, String verificationStatus) {
}
