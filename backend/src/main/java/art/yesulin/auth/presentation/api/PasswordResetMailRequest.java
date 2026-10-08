package art.yesulin.auth.presentation.api;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PasswordResetMailRequest(
        @NotBlank @Email @Size(max = 320) String email
) {
}
