package art.yesulin.application.profile;

import art.yesulin.domain.profile.ProfileAdditionalInformation;
import art.yesulin.domain.profile.ProfileMilitaryServiceStatus;
import java.util.List;

public record ProfileAdditionalInformationResult(
        String school,
        List<String> links,
        String nationality,
        String coverLetter,
        String specialty,
        String hobbies,
        ProfileMilitaryServiceStatus militaryServiceStatus,
        List<ProfileCareerResult> careers
) {

    public ProfileAdditionalInformationResult {
        links = List.copyOf(links);
        careers = List.copyOf(careers);
    }

    public static ProfileAdditionalInformationResult from(ProfileAdditionalInformation information) {
        return new ProfileAdditionalInformationResult(
                information.school(),
                information.links(),
                information.nationality(),
                information.coverLetter(),
                information.specialty(),
                information.hobbies(),
                information.militaryServiceStatus(),
                information.careers().stream().map(ProfileCareerResult::from).toList()
        );
    }

    public static ProfileAdditionalInformationResult empty() {
        return new ProfileAdditionalInformationResult(null, List.of(), null, null, null, null, null, List.of());
    }
}
