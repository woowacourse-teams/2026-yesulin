package art.yesulin.application.submission;

import art.yesulin.domain.submission.SubmissionAdditionalInformation;
import art.yesulin.domain.submission.SubmissionBasicInformation;
import art.yesulin.domain.submission.SubmissionFieldSnapshot;
import art.yesulin.domain.submission.SubmissionFormAnswers;

record ValidatedSubmissionForm(
        SubmissionBasicInformation basicInformation,
        SubmissionAdditionalInformation additionalInformation,
        SubmissionFieldSnapshot fieldSnapshot,
        SubmissionFormAnswers answers
) {
}
