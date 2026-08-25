package art.yesulin.domain.submission;

import java.time.Instant;
import java.util.UUID;

public interface SubmissionSummaryProjection {

    long getId();

    UUID getSubmissionId();

    UUID getAuditionPublicId();

    String getAuditionTitle();

    String getPerformanceTitle();

    String getCompanyName();

    long getPosterFileId();

    long getPosterOwnerId();

    Instant getSubmittedAt();
}
