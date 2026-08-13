package art.yesulin.application.application;

import art.yesulin.domain.application.BasicInformation;
import art.yesulin.domain.application.ConsentEvidence;
import java.util.List;

public record SubmitApplicationCommand(
        long draftId,
        long postingId,
        BasicInformation basicInformation,
        List<Long> roleIds,
        List<SubmissionAnswer> answers,
        ConsentEvidence consentEvidence) {

    public SubmitApplicationCommand {
        roleIds = List.copyOf(roleIds);
        answers = List.copyOf(answers);
    }
}
