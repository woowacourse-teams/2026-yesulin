package art.yesulin.domain.application;

import art.yesulin.domain.recruitment.PostingId;
import java.time.Instant;
import java.util.List;

public record Submission(// no-excuse-ok: domain value object
        PostingId postingId,
        BasicInformation basicInformation,
        List<SelectedRole> roles,
        ConsentEvidence consentEvidence,
        SnapshotDocument snapshot,
        Instant submittedAt) {

    public Submission {
        roles = List.copyOf(roles);
    }
}
