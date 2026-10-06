package art.yesulin.legacy.application.profile;

import art.yesulin.legacy.domain.profile.ProfileCareer;

public record UpdateProfileCareerCommand(int year, String title, String roleName) {

    public ProfileCareer toCareer() {
        return new ProfileCareer(year, title, roleName);
    }
}
