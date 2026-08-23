package art.yesulin.application.submission;

import art.yesulin.domain.submission.SelectedRole;

public record SubmissionSelectedRoleResult(long roleId, String roleName) {

    static SubmissionSelectedRoleResult from(SelectedRole role) {
        return new SubmissionSelectedRoleResult(role.auditionRoleId(), role.roleName());
    }
}
