package art.yesulin.actor.application.profile;

import art.yesulin.actor.domain.profile.ProfileCareer;

public record UpdateProfileCareerCommand(int year, String title, String roleName) {

    public ProfileCareer toCareer() {
        return new ProfileCareer(year, title, roleName);
    }
}
