package art.yesulin.dormant.application.audition.role;

import art.yesulin.dormant.domain.audition.role.AuditionRoleCondition;
import art.yesulin.dormant.domain.audition.role.AuditionRoleSelection;
import art.yesulin.dormant.domain.audition.role.RoleGender;

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
