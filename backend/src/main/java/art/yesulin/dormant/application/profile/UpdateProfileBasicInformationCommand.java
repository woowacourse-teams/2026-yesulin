package art.yesulin.dormant.application.profile;

import art.yesulin.dormant.domain.profile.ProfileBasicInformation;
import art.yesulin.dormant.domain.profile.ProfileGender;
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
