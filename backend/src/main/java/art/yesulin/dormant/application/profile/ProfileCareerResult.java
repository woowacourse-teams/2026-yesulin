package art.yesulin.dormant.application.profile;

import art.yesulin.dormant.domain.profile.ProfileCareer;

public record ProfileCareerResult(int year, String title, String roleName) {

    public static ProfileCareerResult from(ProfileCareer career) {
        return new ProfileCareerResult(career.year(), career.title(), career.roleName());
    }
}
