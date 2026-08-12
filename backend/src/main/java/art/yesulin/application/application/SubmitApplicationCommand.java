package art.yesulin.application.application;

import art.yesulin.domain.application.BasicInformation;
import art.yesulin.domain.application.ConsentEvidence;
import art.yesulin.domain.application.SnapshotDocument;
import java.util.List;

public record SubmitApplicationCommand(
        long draftId,
        long postingId,
        BasicInformation basicInformation,
        List<Long> roleIds,
        List<SubmissionAnswer> answers,
        ConsentEvidence consentEvidence,
        SnapshotDocument snapshot) {

    public SubmitApplicationCommand {
        roleIds = List.copyOf(roleIds);
        answers = List.copyOf(answers);
    }
}
