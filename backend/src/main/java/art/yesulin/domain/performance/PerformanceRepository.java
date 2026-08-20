package art.yesulin.domain.performance;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PerformanceRepository extends JpaRepository<Performance, Long> {

    Optional<Performance> findByIdAndOwnerId(long id, long ownerId);

    boolean existsByIdAndOwnerId(long id, long ownerId);
}
