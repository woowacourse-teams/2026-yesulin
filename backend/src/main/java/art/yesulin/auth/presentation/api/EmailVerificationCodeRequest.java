package art.yesulin.auth.presentation.api;

import art.yesulin.auth.domain.VerificationCode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record EmailVerificationCodeRequest(
        @NotBlank @Pattern(regexp = "[0-9]{6}", message = "인증번호는 숫자 6자리로 입력해 주세요.") String code
) {

    public VerificationCode toCode() {
        return new VerificationCode(code);
    }
}
