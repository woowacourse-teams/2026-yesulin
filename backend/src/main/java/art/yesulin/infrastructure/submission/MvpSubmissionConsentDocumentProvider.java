package art.yesulin.infrastructure.submission;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;
import static art.yesulin.domain.common.validation.DomainValidator.requireText;

import art.yesulin.application.submission.consent.SubmissionConsentDocumentMetadata;
import art.yesulin.application.submission.consent.SubmissionConsentDocumentProvider;
import java.time.Instant;
import org.springframework.stereotype.Component;

@Component
class MvpSubmissionConsentDocumentProvider implements SubmissionConsentDocumentProvider {

    private static final String PRIVACY_VERSION = "submission-collection-v1.0";
    private static final String THIRD_PARTY_VERSION = "submission-third-party-v1.0";

    @Override
    public SubmissionConsentDocumentMetadata currentFor(
            long auditionId,
            String thirdPartyRecipientName,
            Instant referenceTime
    ) {
        requirePositive(auditionId, "동의 문서를 조회할 공고 ID는 1 이상이어야 합니다.");
        String validThirdPartyRecipientName = requireText(
                thirdPartyRecipientName,
                "개인정보를 제공받는 기획사/제작사명은 필수입니다."
        );
        requireNonNull(referenceTime, "동의 문서를 조회할 기준 시각은 필수입니다.");
        return new SubmissionConsentDocumentMetadata(
                PRIVACY_VERSION,
                THIRD_PARTY_VERSION,
                validThirdPartyRecipientName
        );
    }
}
