package art.yesulin.infrastructure.recruitment;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PerformanceRoleTemplateJpaRepository
        extends JpaRepository<PerformanceRoleTemplateJpaEntity, Long> {

    List<PerformanceRoleTemplateJpaEntity> findAllByPerformanceIdOrderById(Long performanceId);
}
