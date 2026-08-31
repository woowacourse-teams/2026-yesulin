package art.yesulin.presentation.api.admin;

import art.yesulin.application.admin.AdminSubmissionSummaryResult;
import java.util.List;

public record AdminSubmissionsResponse(List<AdminSubmissionSummaryResult> submissions) {

    public AdminSubmissionsResponse {
        submissions = List.copyOf(submissions);
    }
}
