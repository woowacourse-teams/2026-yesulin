package art.yesulin.legacy.application.otraudition;

import art.yesulin.legacy.domain.submission.SubmissionAdditionalInformation;
import art.yesulin.legacy.domain.submission.SubmissionBasicInformation;
import art.yesulin.legacy.domain.submission.SubmissionType;
import java.util.List;

public record OtrSubmissionInput(
        SubmissionType type,
        String postingSnapshotVersion,
        String selectedRole,
        SubmissionBasicInformation basicInformation,
        SubmissionAdditionalInformation additionalInformation,
        List<Long> photoFileIds,
        List<String> videoUrls,
        boolean privacyCollectionAndUseAgreed,
        boolean thirdPartyProvisionAgreed
) {
}
