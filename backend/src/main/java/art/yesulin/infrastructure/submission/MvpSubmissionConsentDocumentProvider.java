package art.yesulin.infrastructure.submission;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;

import art.yesulin.application.submission.consent.SubmissionConsentDocumentMetadata;
import art.yesulin.application.submission.consent.SubmissionConsentDocumentProvider;
import java.time.Instant;
import org.springframework.stereotype.Component;

@Component
class MvpSubmissionConsentDocumentProvider implements SubmissionConsentDocumentProvider {

    private static final String PRIVACY_VERSION = "mvp-privacy-placeholder-v0";
    private static final String THIRD_PARTY_VERSION = "mvp-third-party-placeholder-v0";
    private static final String THIRD_PARTY_RECIPIENT_NAME = "MVP 임시 기획사/제작사";

    @Override
    public SubmissionConsentDocumentMetadata currentFor(long auditionId, Instant referenceTime) {
        requirePositive(auditionId, "동의 문서를 조회할 공고 ID는 1 이상이어야 합니다.");
        requireNonNull(referenceTime, "동의 문서를 조회할 기준 시각은 필수입니다.");
        return new SubmissionConsentDocumentMetadata(
                PRIVACY_VERSION,
                THIRD_PARTY_VERSION,
                THIRD_PARTY_RECIPIENT_NAME
        );
    }
}
