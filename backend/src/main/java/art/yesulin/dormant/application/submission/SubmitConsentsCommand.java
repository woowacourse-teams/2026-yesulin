package art.yesulin.dormant.application.submission;

import static art.yesulin.dormant.domain.submission.SubmissionErrorCode.INVALID_CONSENT;

import art.yesulin.global.exception.BusinessException;

public record SubmitConsentsCommand(
        boolean privacyCollectionAndUseAgreed,
        boolean thirdPartyProvisionAgreed
) {

    public SubmitConsentsCommand {
        if (!privacyCollectionAndUseAgreed || !thirdPartyProvisionAgreed) {
            throw new BusinessException(INVALID_CONSENT, "지원서 제출에 필요한 두 개인정보 동의가 모두 필요합니다.");
        }
    }
}
