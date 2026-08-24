package art.yesulin.application.profile;

public record UpdateApplicantProfileCommand(
        UpdateProfileBasicInformationCommand basicInformation,
        UpdateProfileAdditionalInformationCommand additionalInformation
) {
}
