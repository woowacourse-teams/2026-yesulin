package art.yesulin.application.profile;

import art.yesulin.domain.profile.ApplicantProfile;

public record ApplicantProfileResult(
        ProfileBasicInformationResult basicInformation,
        ProfileAdditionalInformationResult additionalInformation,
        ProfileCompletenessResult completeness
) {

    public static ApplicantProfileResult from(ApplicantProfile profile) {
        return new ApplicantProfileResult(
                ProfileBasicInformationResult.from(profile.getBasicInformation()),
                ProfileAdditionalInformationResult.from(profile.getAdditionalInformation()),
                new ProfileCompletenessResult(
                        profile.filledBasicInformationCount(), ApplicantProfile.BASIC_INFORMATION_TOTAL
                )
        );
    }

    public static ApplicantProfileResult empty() {
        return new ApplicantProfileResult(
                ProfileBasicInformationResult.empty(),
                ProfileAdditionalInformationResult.empty(),
                new ProfileCompletenessResult(0, ApplicantProfile.BASIC_INFORMATION_TOTAL)
        );
    }
}
