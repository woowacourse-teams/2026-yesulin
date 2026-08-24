package art.yesulin.support;

import art.yesulin.application.submission.consent.SubmissionConsentDocumentMetadata;
import art.yesulin.application.submission.consent.SubmissionConsentDocumentProvider;
import java.time.Instant;

public class FakeSubmissionConsentDocumentProvider implements SubmissionConsentDocumentProvider {

    private final SubmissionConsentDocumentMetadata metadata;

    private long lastAuditionId;
    private Instant lastReferenceTime;

    public FakeSubmissionConsentDocumentProvider(SubmissionConsentDocumentMetadata metadata) {
        this.metadata = metadata;
    }

    @Override
    public SubmissionConsentDocumentMetadata currentFor(long auditionId, Instant referenceTime) {
        this.lastAuditionId = auditionId;
        this.lastReferenceTime = referenceTime;
        return metadata;
    }

    public long getLastAuditionId() {
        return lastAuditionId;
    }

    public Instant getLastReferenceTime() {
        return lastReferenceTime;
    }
}
