package art.yesulin.domain.audition.form;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditionFormRepository extends JpaRepository<AuditionForm, Long> {

    Optional<AuditionForm> findByAuditionId(long auditionId);
}
