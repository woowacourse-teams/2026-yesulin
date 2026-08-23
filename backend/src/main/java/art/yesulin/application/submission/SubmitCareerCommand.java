package art.yesulin.application.submission;

import art.yesulin.domain.submission.SubmissionCareer;

public record SubmitCareerCommand(int year, String title, String roleName) {

    SubmissionCareer toCareer() {
        return new SubmissionCareer(year, title, roleName);
    }
}
