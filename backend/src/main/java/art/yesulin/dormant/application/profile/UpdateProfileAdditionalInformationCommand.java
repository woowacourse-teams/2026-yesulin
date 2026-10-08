package art.yesulin.dormant.application.profile;

import art.yesulin.dormant.domain.profile.ProfileAdditionalInformation;
import art.yesulin.dormant.domain.profile.ProfileEducationLevel;
import art.yesulin.dormant.domain.profile.ProfileMilitaryServiceStatus;
import java.util.List;

public record UpdateProfileAdditionalInformationCommand(
        ProfileEducationLevel educationLevel,
        String school,
        String major,
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
                educationLevel,
                school,
                major,
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
