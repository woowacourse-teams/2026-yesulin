package art.yesulin.presentation.api.submission;

import art.yesulin.application.submission.SubmitConsentsCommand;
import jakarta.validation.constraints.AssertTrue;

public record SubmitConsentsRequest(
        @AssertTrue(message = "개인정보 수집·이용 동의가 필요합니다.") boolean privacyCollectionAndUseAgreed,
        @AssertTrue(message = "개인정보 제3자 제공 동의가 필요합니다.") boolean thirdPartyProvisionAgreed
) {

    SubmitConsentsCommand toCommand() {
        return new SubmitConsentsCommand(privacyCollectionAndUseAgreed, thirdPartyProvisionAgreed);
    }
}
