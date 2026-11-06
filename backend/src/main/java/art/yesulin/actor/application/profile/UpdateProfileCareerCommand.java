package art.yesulin.actor.application.profile;

import art.yesulin.actor.domain.profile.ProfileCareer;
import art.yesulin.actor.domain.profile.ProfileCareerGenre;

public record UpdateProfileCareerCommand(
        int year, Integer month, String title, String roleName, ProfileCareerGenre genre
) {

    public UpdateProfileCareerCommand(int year, Integer month, String title, String roleName) {
        this(year, month, title, roleName, null);
    }

    public ProfileCareer toCareer() {
        return new ProfileCareer(year, month, title, roleName, genre);
    }
}
