package art.yesulin.presentation.api.submission;

import art.yesulin.application.submission.SubmitSubmissionCommand;
import art.yesulin.domain.submission.SubmissionType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.util.List;

public record SubmitSubmissionRequest(
        SubmissionType type,
        @NotBlank String postingSnapshotVersion,
        @NotNull @Valid SubmitBasicInformationRequest basicInformation,
        @NotNull @Valid SubmitAdditionalInformationRequest additionalInformation,
        @NotEmpty List<@NotNull @Positive Long> selectedRoleIds,
        @NotNull @Valid SubmitFormAnswersRequest formAnswers,
        @NotNull @Valid SubmitConsentsRequest consents
) {

    public SubmitSubmissionRequest(
            String postingSnapshotVersion,
            SubmitBasicInformationRequest basicInformation,
            SubmitAdditionalInformationRequest additionalInformation,
            List<Long> selectedRoleIds,
            SubmitFormAnswersRequest formAnswers,
            SubmitConsentsRequest consents
    ) {
        this(null, postingSnapshotVersion, basicInformation, additionalInformation,
                selectedRoleIds, formAnswers, consents);
    }

    public SubmitSubmissionCommand toCommand() {
        if (type != null && type != SubmissionType.STANDARD) {
            throw new IllegalArgumentException("일반 공고에는 STANDARD 지원서만 제출할 수 있습니다.");
        }
        return new SubmitSubmissionCommand(
                postingSnapshotVersion,
                basicInformation.toCommand(),
                additionalInformation.toCommand(),
                selectedRoleIds,
                formAnswers.toCommand(),
                consents.toCommand()
        );
    }
}
