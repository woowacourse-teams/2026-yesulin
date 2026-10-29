package art.yesulin.actor.application.profile;

import art.yesulin.actor.domain.profile.ProfileCareer;
import art.yesulin.actor.domain.profile.ProfileCareerGenre;

public record UpdateProfileCareerCommand(int year, String title, String roleName, ProfileCareerGenre genre) {

    public UpdateProfileCareerCommand(int year, String title, String roleName) {
        this(year, title, roleName, null);
    }

    public ProfileCareer toCareer() {
        return new ProfileCareer(year, title, roleName, genre);
    }
}
