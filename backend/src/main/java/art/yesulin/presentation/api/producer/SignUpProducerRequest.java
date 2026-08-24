package art.yesulin.presentation.api.producer;

import art.yesulin.application.producer.SignUpProducerCommand;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SignUpProducerRequest(
        @NotBlank @Size(max = 100) String companyName,
        @NotBlank String phone,
        @NotBlank @Email @Size(max = 320) String email,
        @NotBlank @Size(min = 8, max = 64) String password,
        @NotBlank String passwordConfirm,
        boolean termsAgreed
) {

    @AssertTrue(message = "비밀번호가 일치하지 않습니다.")
    public boolean isPasswordConfirmed() {
        return password != null && password.equals(passwordConfirm);
    }

    @AssertTrue(message = "필수 약관에 동의해 주세요.")
    public boolean isTermsAgreed() {
        return termsAgreed;
    }

    public SignUpProducerCommand toCommand() {
        return new SignUpProducerCommand(companyName, phone, email, password);
    }
}
