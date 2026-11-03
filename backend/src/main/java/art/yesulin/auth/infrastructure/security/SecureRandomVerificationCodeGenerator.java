package art.yesulin.auth.infrastructure.security;

import art.yesulin.auth.application.VerificationCodeGenerator;
import art.yesulin.auth.domain.VerificationCode;
import java.security.SecureRandom;
import org.springframework.stereotype.Component;

@Component
public class SecureRandomVerificationCodeGenerator implements VerificationCodeGenerator {

    private final SecureRandom random = new SecureRandom();

    @Override
    public VerificationCode generate() {
        return VerificationCode.fromNumber(random.nextInt(1_000_000));
    }
}
