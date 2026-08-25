package art.yesulin.domain.submission;

import java.util.List;

public interface SubmissionRepositoryCustom {

    List<Submission> findAllForScreening(
            long auditionId,
            long roleId,
            ScreeningSubmissionSearchCondition condition
    );
}
