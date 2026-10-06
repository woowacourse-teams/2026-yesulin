package art.yesulin.legacy.application.submission;

import art.yesulin.legacy.domain.submission.SubmissionCareer;

public record SubmitCareerCommand(int year, String title, String roleName) {

    SubmissionCareer toCareer() {
        return new SubmissionCareer(year, title, roleName);
    }
}
