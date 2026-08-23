package art.yesulin.application.submission;

public record SubmitConsentsCommand(
        boolean privacyCollectionAndUseAgreed,
        boolean thirdPartyProvisionAgreed
) {
}
