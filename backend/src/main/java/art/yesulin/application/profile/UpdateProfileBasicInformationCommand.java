package art.yesulin.application.profile;

import art.yesulin.domain.profile.ProfileBasicInformation;
import art.yesulin.domain.profile.ProfileGender;
import java.time.LocalDate;

public record UpdateProfileBasicInformationCommand(
        String name,
        Integer height,
        Integer weight,
        LocalDate birthDate,
        ProfileGender gender,
        String phone,
        String email,
        String address
) {

    public ProfileBasicInformation toInformation(LocalDate today) {
        return new ProfileBasicInformation(name, height, weight, birthDate, gender, phone, email, address, today);
    }
}
