package art.yesulin.legacy.application.profile;

public record UpdateApplicantProfileCommand(
        UpdateProfileBasicInformationCommand basicInformation,
        UpdateProfileAdditionalInformationCommand additionalInformation
) {
}
