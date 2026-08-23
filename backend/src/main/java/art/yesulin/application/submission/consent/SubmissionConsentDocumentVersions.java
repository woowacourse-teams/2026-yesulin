package art.yesulin.application.submission.consent;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.common.validation.DomainValidator.requireText;
import static art.yesulin.domain.submission.SubmissionErrorCode.INVALID_CONSENT;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.submission.SubmissionConsent;
import art.yesulin.domain.submission.SubmissionConsentType;

public record SubmissionConsentDocumentVersions(
        String privacyCollectionAndUse,
        String thirdPartyProvision
) {

    public SubmissionConsentDocumentVersions {
        privacyCollectionAndUse = normalize(privacyCollectionAndUse);
        thirdPartyProvision = normalize(thirdPartyProvision);
    }

    private static String normalize(String version) {
        String normalizedVersion = requireText(version, "지원서 동의 문서 버전은 필수입니다.");
        if (normalizedVersion.length() > SubmissionConsent.MAX_DOCUMENT_VERSION_LENGTH) {
            throw new BusinessException(INVALID_CONSENT, "지원서 동의 문서 버전은 100자를 넘을 수 없습니다.");
        }
        return normalizedVersion;
    }

    public String versionOf(SubmissionConsentType consentType) {
        return switch (requireNonNull(consentType, "지원서 동의 유형은 필수입니다.")) {
            case PRIVACY_COLLECTION_AND_USE -> privacyCollectionAndUse;
            case THIRD_PARTY_PROVISION -> thirdPartyProvision;
        };
    }
}
