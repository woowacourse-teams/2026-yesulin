package art.yesulin.domain.submission;

import java.time.Instant;
import java.util.UUID;

public interface SubmissionSummaryProjection {

    long getId();

    UUID getSubmissionId();

    String getAuditionTitle();

    Instant getSubmittedAt();
}
