package art.yesulin.dormant.application.submission;

import art.yesulin.dormant.domain.submission.SubmissionCareer;

public record SubmitCareerCommand(int year, String title, String roleName) {

    SubmissionCareer toCareer() {
        return new SubmissionCareer(year, title, roleName);
    }
}
