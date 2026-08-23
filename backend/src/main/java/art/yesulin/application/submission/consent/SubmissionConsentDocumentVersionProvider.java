package art.yesulin.application.submission.consent;

import java.time.Instant;

public interface SubmissionConsentDocumentVersionProvider {

    SubmissionConsentDocumentVersions currentAt(Instant referenceTime);
}
