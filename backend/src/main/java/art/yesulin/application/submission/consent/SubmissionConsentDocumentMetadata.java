package art.yesulin.application.submission.consent;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.common.validation.DomainValidator.requireText;
import static art.yesulin.domain.submission.SubmissionErrorCode.INVALID_CONSENT;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.submission.SubmissionConsent;
import art.yesulin.domain.submission.SubmissionConsentType;

public record SubmissionConsentDocumentMetadata(
        String privacyCollectionAndUseVersion,
        String thirdPartyProvisionVersion,
        String thirdPartyRecipientName
) {

    public SubmissionConsentDocumentMetadata {
        privacyCollectionAndUseVersion = normalizeVersion(privacyCollectionAndUseVersion);
        thirdPartyProvisionVersion = normalizeVersion(thirdPartyProvisionVersion);
        thirdPartyRecipientName = normalizeRecipientName(thirdPartyRecipientName);
    }

    private static String normalizeVersion(String version) {
        String normalizedVersion = requireText(version, "지원서 동의 문서 버전은 필수입니다.");
        if (normalizedVersion.length() > SubmissionConsent.MAX_DOCUMENT_VERSION_LENGTH) {
            throw new BusinessException(INVALID_CONSENT, "지원서 동의 문서 버전은 100자를 넘을 수 없습니다.");
        }
        return normalizedVersion;
    }

    private static String normalizeRecipientName(String recipientName) {
        String normalizedName = requireText(recipientName, "개인정보를 제공받는 기획사/제작사명은 필수입니다.");
        if (normalizedName.length() > SubmissionConsent.MAX_RECIPIENT_NAME_LENGTH) {
            throw new BusinessException(INVALID_CONSENT, "기획사/제작사명은 255자를 넘을 수 없습니다.");
        }
        return normalizedName;
    }

    public String versionOf(SubmissionConsentType consentType) {
        return switch (requireNonNull(consentType, "지원서 동의 유형은 필수입니다.")) {
            case PRIVACY_COLLECTION_AND_USE -> privacyCollectionAndUseVersion;
            case THIRD_PARTY_PROVISION -> thirdPartyProvisionVersion;
        };
    }
}
