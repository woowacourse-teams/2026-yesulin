package art.yesulin.domain.audition;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditionRepository extends JpaRepository<Audition, Long> {

    Optional<Audition> findByIdAndOwnerId(long id, long ownerId);
}
