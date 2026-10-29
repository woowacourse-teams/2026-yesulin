package art.yesulin.actor.presentation.api.profile;

import art.yesulin.actor.application.profile.UpdateProfileCareerCommand;
import art.yesulin.actor.domain.profile.ProfileCareer;
import art.yesulin.actor.domain.profile.ProfileCareerGenre;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateProfileCareerRequest(
        @Min(1000) @Max(9999) int year,
        @NotBlank @Size(max = ProfileCareer.MAX_TITLE_LENGTH) String title,
        @NotBlank @Size(max = ProfileCareer.MAX_ROLE_NAME_LENGTH) String roleName,
        ProfileCareerGenre genre
) {

    public UpdateProfileCareerCommand toCommand() {
        return new UpdateProfileCareerCommand(year, title, roleName, genre);
    }
}
