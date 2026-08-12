package art.yesulin.infrastructure.recruitment;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoleJpaRepository extends JpaRepository<RoleJpaEntity, Long> {

    Optional<RoleJpaEntity> findBySourceId(String sourceId);

    List<RoleJpaEntity> findAllByPostingIdOrderById(Long postingId);

    List<RoleJpaEntity> findAllByIdIn(Collection<Long> ids);
}
