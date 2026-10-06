package art.yesulin.legacy.application.submission;

import art.yesulin.legacy.application.submission.consent.SubmissionConsentDocumentMetadata;
import art.yesulin.legacy.domain.submission.Submission;
import art.yesulin.legacy.domain.submission.SubmissionConsent;
import art.yesulin.legacy.domain.submission.SubmissionConsentRepository;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class SubmissionConsentWriter {

    private final SubmissionConsentRepository consentRepository;

    void save(
            Submission submission,
            SubmissionConsentDocumentMetadata documentMetadata,
            Instant agreedAt
    ) {
        consentRepository.saveAllAndFlush(List.of(
                SubmissionConsent.agreeToPrivacyCollectionAndUse(
                        submission.getSubmissionId(),
                        submission.getApplicantId(),
                        documentMetadata.privacyCollectionAndUseVersion(),
                        agreedAt
                ),
                SubmissionConsent.agreeToThirdPartyProvision(
                        submission.getSubmissionId(),
                        submission.getApplicantId(),
                        documentMetadata.thirdPartyProvisionVersion(),
                        documentMetadata.thirdPartyRecipientName(),
                        agreedAt
                )
        ));
    }
}
