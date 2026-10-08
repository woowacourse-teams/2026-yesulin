package art.yesulin.producer.application;

public record SignUpProducerCommand(
        String companyName,
        String phone,
        String email,
        String password
) {
}
