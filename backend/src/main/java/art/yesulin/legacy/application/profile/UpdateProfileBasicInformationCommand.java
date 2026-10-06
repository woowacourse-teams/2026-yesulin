package art.yesulin.legacy.application.profile;

import art.yesulin.legacy.domain.profile.ProfileBasicInformation;
import art.yesulin.legacy.domain.profile.ProfileGender;
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
