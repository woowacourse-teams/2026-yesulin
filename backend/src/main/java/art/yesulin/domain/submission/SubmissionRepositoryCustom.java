package art.yesulin.domain.submission;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SubmissionRepositoryCustom {

    List<Submission> findAllForScreening(
            long auditionId,
            long roleId,
            ScreeningSubmissionSearchCondition condition
    );

    List<SubmissionSummaryRow> findSummaryRowsByApplicantId(long applicantId);

    Optional<SubmissionSummaryRow> findSummaryRowBySubmissionId(UUID submissionId);
}
