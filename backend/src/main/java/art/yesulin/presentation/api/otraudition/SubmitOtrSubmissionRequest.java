package art.yesulin.presentation.api.otraudition;

import art.yesulin.application.otraudition.OtrSubmissionInput;
import art.yesulin.domain.submission.SubmissionType;
import art.yesulin.presentation.api.submission.SubmitAdditionalInformationRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;

public record SubmitOtrSubmissionRequest(
        @NotNull SubmissionType type,
        @NotBlank String postingSnapshotVersion,
        @NotBlank String selectedRole,
        @NotNull @Valid SubmitOtrBasicInformationRequest basicInformation,
        @NotNull @Valid SubmitAdditionalInformationRequest additionalInformation,
        @NotNull @Size(max = 3) List<@NotNull @Positive Long> photoFileIds,
        @NotNull @Size(max = 3) List<@NotBlank String> videoUrls,
        @AssertTrue boolean privacyCollectionAndUseAgreed,
        @AssertTrue boolean thirdPartyProvisionAgreed
) {

    OtrSubmissionInput toInput() {
        if (type != SubmissionType.OTR) {
            throw new IllegalArgumentException("OTR 공고에는 OTR 지원서만 제출할 수 있습니다.");
        }
        return new OtrSubmissionInput(type, postingSnapshotVersion, selectedRole, basicInformation.toDomain(),
                additionalInformation.toCommand().toInformation(), photoFileIds, videoUrls,
                privacyCollectionAndUseAgreed, thirdPartyProvisionAgreed);
    }
}
