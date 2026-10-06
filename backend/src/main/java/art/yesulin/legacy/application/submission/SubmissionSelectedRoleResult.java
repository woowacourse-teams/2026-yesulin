package art.yesulin.legacy.application.submission;

import art.yesulin.legacy.domain.submission.SelectedRole;

public record SubmissionSelectedRoleResult(long roleId, String roleName) {

    static SubmissionSelectedRoleResult from(SelectedRole role) {
        return new SubmissionSelectedRoleResult(role.auditionRoleId(), role.roleName());
    }
}
