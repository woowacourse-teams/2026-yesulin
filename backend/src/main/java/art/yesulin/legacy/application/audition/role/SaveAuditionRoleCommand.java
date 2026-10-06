package art.yesulin.legacy.application.audition.role;

import art.yesulin.legacy.domain.audition.role.AuditionRoleCondition;
import art.yesulin.legacy.domain.audition.role.AuditionRoleSelection;
import art.yesulin.legacy.domain.audition.role.RoleGender;

public record SaveAuditionRoleCommand(
        long performanceRoleId,
        int recruitmentCount,
        RoleGender gender,
        int minimumAge,
        int maximumAge
) {

    public AuditionRoleSelection toSelection() {
        AuditionRoleCondition condition = new AuditionRoleCondition(recruitmentCount, gender, minimumAge, maximumAge);
        return new AuditionRoleSelection(performanceRoleId, condition);
    }
}
