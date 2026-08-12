package art.yesulin.infrastructure.recruitment;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PerformanceJpaRepository extends JpaRepository<PerformanceJpaEntity, Long> {

    Optional<PerformanceJpaEntity> findBySourceId(String sourceId);

    List<PerformanceJpaEntity> findAllByCompanyIdOrderById(Long companyId);

    Optional<PerformanceJpaEntity> findByIdAndCompanyId(Long id, Long companyId);
}
