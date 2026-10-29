package art.yesulin.actor.application.profile;

public record UpdateApplicantProfileCommand(
        UpdateProfileBasicInformationCommand basicInformation,
        UpdateProfileAdditionalInformationCommand additionalInformation
) {
}
