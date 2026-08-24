package art.yesulin.presentation.api.submission;

import art.yesulin.application.submission.SubmitBasicInformationCommand;
import art.yesulin.domain.submission.SubmissionBasicInformation;
import art.yesulin.domain.submission.SubmissionGender;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.Locale;

public record SubmitBasicInformationRequest(
        @Size(max = SubmissionBasicInformation.MAX_NAME_LENGTH) String name,
        @Positive Integer height,
        @Positive Integer weight,
        @PastOrPresent LocalDate birthDate,
        @Pattern(regexp = "(?i)FEMALE|MALE") String gender,
        @Pattern(regexp = "\\d{3}-\\d{4}-\\d{4}") String phone,
        @Email @Size(max = SubmissionBasicInformation.MAX_EMAIL_LENGTH) String email,
        @Size(max = SubmissionBasicInformation.MAX_ADDRESS_LENGTH) String address
) {

    SubmitBasicInformationCommand toCommand() {
        return new SubmitBasicInformationCommand(
                name,
                height,
                weight,
                birthDate,
                parseGender(),
                phone,
                email,
                address
        );
    }

    private SubmissionGender parseGender() {
        if (gender == null) {
            return null;
        }
        return SubmissionGender.valueOf(gender.toUpperCase(Locale.ROOT));
    }
}
