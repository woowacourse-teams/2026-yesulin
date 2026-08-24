package art.yesulin.application.submission;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record SubmissionSummaryResult(
        UUID submissionId,
        String auditionTitle,
        Instant submittedAt,
        List<SubmissionSelectedRoleResult> selectedRoles
) {

    public SubmissionSummaryResult {
        selectedRoles = List.copyOf(selectedRoles);
    }
}
