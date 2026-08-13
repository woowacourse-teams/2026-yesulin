package art.yesulin.infrastructure.screening;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApplicationReviewJpaRepository
        extends JpaRepository<ApplicationReviewJpaEntity, Long> {

    List<ApplicationReviewJpaEntity> findAllByRoleIdAndRoundNumber(
            Long roleId, int roundNumber);

    Optional<ApplicationReviewJpaEntity> findByApplicationIdAndRoleIdAndRoundNumber(
            Long applicationId, Long roleId, int roundNumber);
}
