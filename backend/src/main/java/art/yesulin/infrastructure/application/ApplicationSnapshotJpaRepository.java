package art.yesulin.infrastructure.application;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApplicationSnapshotJpaRepository
        extends JpaRepository<ApplicationSnapshotJpaEntity, Long> {

    Optional<ApplicationSnapshotJpaEntity> findByApplicationId(Long applicationId);
}
