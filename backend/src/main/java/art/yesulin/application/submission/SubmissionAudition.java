package art.yesulin.application.submission;

import java.time.Instant;
import java.util.List;

record SubmissionAudition(
        long auditionId,
        String title,
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
