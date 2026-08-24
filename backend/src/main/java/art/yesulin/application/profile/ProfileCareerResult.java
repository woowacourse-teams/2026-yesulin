package art.yesulin.application.profile;

import art.yesulin.domain.profile.ProfileCareer;

public record ProfileCareerResult(int year, String title, String roleName) {

    public static ProfileCareerResult from(ProfileCareer career) {
        return new ProfileCareerResult(career.year(), career.title(), career.roleName());
    }
}
