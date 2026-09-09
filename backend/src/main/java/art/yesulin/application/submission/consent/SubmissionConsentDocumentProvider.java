package art.yesulin.application.submission.consent;

import java.time.Instant;

public interface SubmissionConsentDocumentProvider {

    SubmissionConsentDocumentMetadata currentFor(
            long auditionId,
            String thirdPartyRecipientName,
            Instant referenceTime
    );
}
