package art.yesulin.legacy.presentation.api.profile;

import art.yesulin.legacy.application.profile.UpdateProfileAdditionalInformationCommand;
import art.yesulin.legacy.domain.profile.ProfileAdditionalInformation;
import art.yesulin.legacy.domain.profile.ProfileEducationLevel;
import art.yesulin.legacy.domain.profile.ProfileMilitaryServiceStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record UpdateProfileAdditionalInformationRequest(
        ProfileEducationLevel educationLevel,
        @Size(max = ProfileAdditionalInformation.MAX_SCHOOL_LENGTH) String school,
        @Size(max = ProfileAdditionalInformation.MAX_SCHOOL_LENGTH) String major,
        @NotNull @Size(max = ProfileAdditionalInformation.MAX_LINK_COUNT)
        List<@NotBlank @Size(max = ProfileAdditionalInformation.MAX_LINK_LENGTH) String> links,
        @Size(max = ProfileAdditionalInformation.MAX_NATIONALITY_LENGTH) String nationality,
        @Size(max = ProfileAdditionalInformation.MAX_COVER_LETTER_LENGTH) String coverLetter,
        @Size(max = ProfileAdditionalInformation.MAX_SPECIALTY_LENGTH) String specialty,
        @Size(max = ProfileAdditionalInformation.MAX_HOBBIES_LENGTH) String hobbies,
        ProfileMilitaryServiceStatus militaryServiceStatus,
        @NotNull @Size(max = ProfileAdditionalInformation.MAX_CAREER_COUNT)
        List<@NotNull @Valid UpdateProfileCareerRequest> careers
) {

    public UpdateProfileAdditionalInformationCommand toCommand() {
        return new UpdateProfileAdditionalInformationCommand(
                educationLevel,
                school,
                major,
                links,
                nationality,
                coverLetter,
                specialty,
                hobbies,
                militaryServiceStatus,
                careers.stream().map(UpdateProfileCareerRequest::toCommand).toList()
        );
    }
}
