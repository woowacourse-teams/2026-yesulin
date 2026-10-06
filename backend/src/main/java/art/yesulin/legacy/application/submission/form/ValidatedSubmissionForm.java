package art.yesulin.legacy.application.submission.form;

import art.yesulin.legacy.domain.submission.SubmissionAdditionalInformation;
import art.yesulin.legacy.domain.submission.SubmissionBasicInformation;
import art.yesulin.legacy.domain.submission.SubmissionFieldSnapshot;
import art.yesulin.legacy.domain.submission.SubmissionFormAnswers;

public record ValidatedSubmissionForm(
        SubmissionBasicInformation basicInformation,
        SubmissionAdditionalInformation additionalInformation,
        SubmissionFieldSnapshot fieldSnapshot,
        SubmissionFormAnswers answers
) {
}
