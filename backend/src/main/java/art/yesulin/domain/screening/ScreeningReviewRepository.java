package art.yesulin.domain.screening;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScreeningReviewRepository extends JpaRepository<ScreeningReview, Long> {

    Optional<ScreeningReview> findByApplicationIdAndAuditionRoleIdAndScreeningStageId(
            UUID applicationId,
            long auditionRoleId,
            long screeningStageId
    );

    List<ScreeningReview> findAllByAuditionRoleIdAndScreeningStageIdAndApplicationIdIn(
            long auditionRoleId,
            long screeningStageId,
            Collection<UUID> applicationIds
    );
}
