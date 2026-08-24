package art.yesulin.application.submission.form;

import art.yesulin.domain.submission.SubmissionAdditionalInformation;
import art.yesulin.domain.submission.SubmissionBasicInformation;
import art.yesulin.domain.submission.SubmissionFieldSnapshot;
import art.yesulin.domain.submission.SubmissionFormAnswers;

public record ValidatedSubmissionForm(
        SubmissionBasicInformation basicInformation,
        SubmissionAdditionalInformation additionalInformation,
        SubmissionFieldSnapshot fieldSnapshot,
        SubmissionFormAnswers answers
) {
}
