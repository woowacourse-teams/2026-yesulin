package art.yesulin.presentation.api.otraudition;

import art.yesulin.domain.submission.SubmissionBasicInformation;
import art.yesulin.domain.submission.SubmissionGender;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record SubmitOtrBasicInformationRequest(
        @NotBlank @Size(max = 100) String name,
        @NotNull @Positive Integer height,
        @NotNull @Positive Integer weight,
        @NotNull @PastOrPresent LocalDate birthDate,
        @NotNull SubmissionGender gender,
        @NotBlank @Pattern(regexp = "\\d{3}-\\d{4}-\\d{4}") String phone,
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Size(max = 100) String address
) {

    SubmissionBasicInformation toDomain() {
        return new SubmissionBasicInformation(name, height, weight, birthDate, gender, phone, email, address);
    }
}
