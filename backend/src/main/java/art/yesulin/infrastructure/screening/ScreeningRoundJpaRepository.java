package art.yesulin.infrastructure.screening;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScreeningRoundJpaRepository extends JpaRepository<ScreeningRoundJpaEntity, Long> {

    List<ScreeningRoundJpaEntity> findAllByRoleIdOrderByRoundNumber(Long roleId);

    Optional<ScreeningRoundJpaEntity> findByRoleIdAndRoundNumber(Long roleId, int roundNumber);

    void deleteAllByRoleId(Long roleId);
}
