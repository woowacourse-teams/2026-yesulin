package art.yesulin.domain.screening;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScreeningReviewRepository extends JpaRepository<ScreeningReview, Long> {

    List<ScreeningReview> findAllByAuditionRoleIdAndSubmissionIdIn(
            long auditionRoleId,
            Collection<UUID> submissionIds
    );

    void deleteByAuditionRoleIdIn(Collection<Long> auditionRoleIds);

    void deleteBySubmissionId(UUID submissionId);

    boolean existsByScreeningStageIdIn(Collection<Long> screeningStageIds);
}
