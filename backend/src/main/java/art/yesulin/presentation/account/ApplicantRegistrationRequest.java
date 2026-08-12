package art.yesulin.presentation.account;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ApplicantRegistrationRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, max = 72) String password) {
}
