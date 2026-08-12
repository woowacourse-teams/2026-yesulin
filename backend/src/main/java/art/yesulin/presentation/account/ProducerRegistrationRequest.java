package art.yesulin.presentation.account;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ProducerRegistrationRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, max = 72) String password,
        @NotBlank @Size(max = 200) String companyName,
        @Size(max = 30) String businessNumber,
        @Size(max = 100) String representativeName,
        @NotBlank @Size(max = 100) String contactName) {
}
