package art.yesulin.auth.application;

import art.yesulin.auth.domain.VerificationCode;

public interface VerificationCodeGenerator {

    VerificationCode generate();
}
