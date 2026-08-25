package art.yesulin.application.submission;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record SubmissionSummaryResult(
        UUID submissionId,
        UUID auditionId,
        String performanceTitle,
        String auditionTitle,
        String companyName,
        long posterFileId,
        long posterOwnerId,
        Instant submittedAt,
        List<SubmissionSelectedRoleResult> selectedRoles
) {

    public SubmissionSummaryResult {
        selectedRoles = List.copyOf(selectedRoles);
    }
}
