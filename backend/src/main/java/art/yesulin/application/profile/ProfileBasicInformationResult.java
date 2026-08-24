package art.yesulin.application.profile;

import art.yesulin.domain.profile.ProfileBasicInformation;
import art.yesulin.domain.profile.ProfileGender;
import java.time.LocalDate;

public record ProfileBasicInformationResult(
        String name,
        Integer height,
        Integer weight,
        LocalDate birthDate,
        ProfileGender gender,
        String phone,
        String email,
        String address
) {

    public static ProfileBasicInformationResult from(ProfileBasicInformation information) {
        return new ProfileBasicInformationResult(
                information.name(),
                information.height(),
                information.weight(),
                information.birthDate(),
                information.gender(),
                information.phone(),
                information.email(),
                information.address()
        );
    }

    public static ProfileBasicInformationResult empty() {
        return new ProfileBasicInformationResult(null, null, null, null, null, null, null, null);
    }
}
