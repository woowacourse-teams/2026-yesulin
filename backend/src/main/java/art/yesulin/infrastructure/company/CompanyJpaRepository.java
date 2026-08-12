package art.yesulin.infrastructure.company;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompanyJpaRepository extends JpaRepository<CompanyJpaEntity, Long> {

    Optional<CompanyJpaEntity> findBySourceId(String sourceId);
}
