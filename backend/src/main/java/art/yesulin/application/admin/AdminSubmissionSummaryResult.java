package art.yesulin.application.admin;

import art.yesulin.domain.submission.SelectedRole;
import art.yesulin.domain.submission.Submission;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record AdminSubmissionSummaryResult(
        UUID submissionId,
        String applicantName,
        String applicantEmail,
        String applicantPhone,
        Instant submittedAt,
        List<SelectedRoleResult> selectedRoles
) {

    public AdminSubmissionSummaryResult {
        selectedRoles = List.copyOf(selectedRoles);
    }

    public static AdminSubmissionSummaryResult from(Submission submission) {
        return new AdminSubmissionSummaryResult(
                submission.getSubmissionId(),
                submission.getApplicantSnapshot().getBasicInformation().name(),
                submission.getApplicantSnapshot().getBasicInformation().email(),
                submission.getApplicantSnapshot().getBasicInformation().phone(),
                submission.getSubmittedAt(),
                submission.getSelectedRoles().values().stream().map(SelectedRoleResult::from).toList()
        );
    }

    public record SelectedRoleResult(long roleId, String roleName) {

        private static SelectedRoleResult from(SelectedRole role) {
            return new SelectedRoleResult(role.auditionRoleId(), role.roleName());
        }
    }
}
