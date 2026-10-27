package art.yesulin.actor.application.profile;

import art.yesulin.actor.domain.profile.ProfileCareer;
import art.yesulin.actor.domain.profile.ProfileCareerGenre;

public record ProfileCareerResult(int year, String title, String roleName, ProfileCareerGenre genre) {

    public static ProfileCareerResult from(ProfileCareer career) {
        return new ProfileCareerResult(career.year(), career.title(), career.roleName(), career.genre());
    }
}
