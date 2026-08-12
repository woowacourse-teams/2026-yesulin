package art.yesulin.application.account;

public interface AccountRegistrationService {

    ApplicantRegistrationResult registerApplicant(String rawEmail, String rawPassword);

    ProducerRegistrationResult registerProducer(
            String rawEmail,
            String rawPassword,
            String companyName,
            String businessNumber,
            String representativeName,
            String contactName);
}
