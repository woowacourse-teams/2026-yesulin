package art.yesulin.presentation.api.auth;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PasswordResetChangeRequest(
        @NotBlank @Size(max = 512) String token,
        @NotBlank @Size(min = 8, max = 64) String password,
        @NotBlank String passwordConfirm
) {

    @AssertTrue(message = "비밀번호가 일치하지 않습니다.")
    public boolean isPasswordConfirmed() {
        return password != null && password.equals(passwordConfirm);
    }
}
