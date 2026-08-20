package art.yesulin.domain.audition.role;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditionRoleSectionRepository extends JpaRepository<AuditionRoleSection, Long> {

    Optional<AuditionRoleSection> findByAuditionId(long auditionId);
}
