package art.yesulin.support;

import art.yesulin.application.submission.consent.SubmissionConsentDocumentVersionProvider;
import art.yesulin.application.submission.consent.SubmissionConsentDocumentVersions;
import java.time.Instant;

public class FakeSubmissionConsentDocumentVersionProvider implements SubmissionConsentDocumentVersionProvider {

    private final SubmissionConsentDocumentVersions versions;

    private Instant lastReferenceTime;

    public FakeSubmissionConsentDocumentVersionProvider(SubmissionConsentDocumentVersions versions) {
        this.versions = versions;
    }

    @Override
    public SubmissionConsentDocumentVersions currentAt(Instant referenceTime) {
        this.lastReferenceTime = referenceTime;
        return versions;
    }

    public Instant getLastReferenceTime() {
        return lastReferenceTime;
    }
}
