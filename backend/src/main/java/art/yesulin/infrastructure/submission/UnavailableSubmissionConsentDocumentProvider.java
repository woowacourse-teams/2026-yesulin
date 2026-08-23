package art.yesulin.infrastructure.submission;

import art.yesulin.application.submission.consent.SubmissionConsentDocumentMetadata;
import art.yesulin.application.submission.consent.SubmissionConsentDocumentProvider;
import java.time.Instant;
import org.springframework.stereotype.Component;

@Component
class UnavailableSubmissionConsentDocumentProvider implements SubmissionConsentDocumentProvider {

    @Override
    public SubmissionConsentDocumentMetadata currentFor(long auditionId, Instant referenceTime) {
        throw new IllegalStateException("활성화된 지원서 동의 문서가 없습니다.");
    }
}
