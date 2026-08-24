package art.yesulin.presentation.api.profile;

import art.yesulin.application.profile.UpdateProfileBasicInformationCommand;
import art.yesulin.domain.profile.ProfileBasicInformation;
import art.yesulin.domain.profile.ProfileGender;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record UpdateProfileBasicInformationRequest(
        @Size(max = ProfileBasicInformation.MAX_NAME_LENGTH) String name,
        @Positive Integer height,
        @Positive Integer weight,
        @PastOrPresent LocalDate birthDate,
        ProfileGender gender,
        @Pattern(regexp = "\\d{3}-\\d{4}-\\d{4}") String phone,
        @Email @Size(max = ProfileBasicInformation.MAX_EMAIL_LENGTH) String email,
        @Size(max = ProfileBasicInformation.MAX_ADDRESS_LENGTH) String address
) {

    public UpdateProfileBasicInformationCommand toCommand() {
        return new UpdateProfileBasicInformationCommand(
                name, height, weight, birthDate, gender, phone, email, address
        );
    }
}
