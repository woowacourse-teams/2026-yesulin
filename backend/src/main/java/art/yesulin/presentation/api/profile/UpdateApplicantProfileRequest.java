package art.yesulin.presentation.api.profile;

import art.yesulin.application.profile.UpdateApplicantProfileCommand;
import jakarta.validation.Valid;

public record UpdateApplicantProfileRequest(
        @Valid UpdateProfileBasicInformationRequest basicInformation,
        @Valid UpdateProfileAdditionalInformationRequest additionalInformation
) {

    public UpdateApplicantProfileCommand toCommand() {
        return new UpdateApplicantProfileCommand(
                basicInformation == null ? null : basicInformation.toCommand(),
                additionalInformation == null ? null : additionalInformation.toCommand()
        );
    }
}
