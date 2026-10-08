package art.yesulin.dormant.application.profile;

public record UpdateApplicantProfileCommand(
        UpdateProfileBasicInformationCommand basicInformation,
        UpdateProfileAdditionalInformationCommand additionalInformation
) {
}
