package art.yesulin.application.submission;

import art.yesulin.application.submission.form.SubmissionFormDefinition;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

record SubmissionAudition(
        long auditionId,
        UUID publicAuditionId,
        String title,
        String performanceTitle,
        String companyName,
        long posterFileId,
        long posterOwnerId,
        Instant recruitmentStartAt,
        Instant recruitmentEndAt,
        boolean multipleRoleApplicationsAllowed,
        List<SubmissionAuditionRole> roles,
        SubmissionFormDefinition form
) {

    SubmissionAudition {
        roles = List.copyOf(roles);
    }
}
