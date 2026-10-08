package art.yesulin.dormant.application.submission.form;

import art.yesulin.dormant.domain.submission.SubmissionAdditionalInformation;
import art.yesulin.dormant.domain.submission.SubmissionBasicInformation;
import art.yesulin.dormant.domain.submission.SubmissionFieldSnapshot;
import art.yesulin.dormant.domain.submission.SubmissionFormAnswers;

public record ValidatedSubmissionForm(
        SubmissionBasicInformation basicInformation,
        SubmissionAdditionalInformation additionalInformation,
        SubmissionFieldSnapshot fieldSnapshot,
        SubmissionFormAnswers answers
) {
}
