package art.yesulin.application.otraudition;

import art.yesulin.domain.submission.SubmissionAdditionalInformation;
import art.yesulin.domain.submission.SubmissionBasicInformation;
import art.yesulin.domain.submission.SubmissionType;
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
