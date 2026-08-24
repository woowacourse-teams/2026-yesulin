package art.yesulin.application.producer;

public record SignUpProducerCommand(
        String companyName,
        String phone,
        String email,
        String password
) {
}
