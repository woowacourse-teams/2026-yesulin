package art.yesulin.application.profile;

import art.yesulin.domain.profile.ProfileAdditionalInformation;
import art.yesulin.domain.profile.ProfileMilitaryServiceStatus;
import java.util.List;

public record UpdateProfileAdditionalInformationCommand(
        String school,
        List<String> links,
        String nationality,
        String coverLetter,
        String specialty,
        String hobbies,
        ProfileMilitaryServiceStatus militaryServiceStatus,
        List<UpdateProfileCareerCommand> careers
) {

    public UpdateProfileAdditionalInformationCommand {
        links = links == null ? null : List.copyOf(links);
        careers = careers == null ? null : List.copyOf(careers);
    }

    public ProfileAdditionalInformation toInformation() {
        return new ProfileAdditionalInformation(
                school,
                links,
                nationality,
                coverLetter,
                specialty,
                hobbies,
                militaryServiceStatus,
                careers == null ? null : careers.stream().map(UpdateProfileCareerCommand::toCareer).toList()
        );
    }
}
