package art.yesulin.legacy.application.profile;

import art.yesulin.legacy.domain.profile.ProfileCareer;

public record ProfileCareerResult(int year, String title, String roleName) {

    public static ProfileCareerResult from(ProfileCareer career) {
        return new ProfileCareerResult(career.year(), career.title(), career.roleName());
    }
}
