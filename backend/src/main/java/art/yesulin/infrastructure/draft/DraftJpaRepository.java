package art.yesulin.infrastructure.draft;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DraftJpaRepository extends JpaRepository<DraftJpaEntity, Long> {

    Optional<DraftJpaEntity> findByAccountIdAndPostingId(Long accountId, Long postingId);
}
