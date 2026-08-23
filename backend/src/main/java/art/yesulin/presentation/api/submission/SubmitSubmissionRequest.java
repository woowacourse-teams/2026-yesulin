package art.yesulin.presentation.api.submission;

import art.yesulin.application.submission.SubmitSubmissionCommand;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.util.List;

public record SubmitSubmissionRequest(
        @NotNull @Valid SubmitBasicInformationRequest basicInformation,
        @NotNull @Valid SubmitAdditionalInformationRequest additionalInformation,
        @NotEmpty List<@NotNull @Positive Long> selectedRoleIds,
        @NotNull @Valid SubmitFormAnswersRequest formAnswers,
        @NotNull @Valid SubmitConsentsRequest consents
) {

    public SubmitSubmissionCommand toCommand() {
        return new SubmitSubmissionCommand(
                basicInformation.toCommand(),
                additionalInformation.toCommand(),
                selectedRoleIds,
                formAnswers.toCommand(),
                consents.toCommand()
        );
    }
}
