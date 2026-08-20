package art.yesulin.domain.audition.schedule;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditionScheduleRepository extends JpaRepository<AuditionSchedule, Long> {

    Optional<AuditionSchedule> findByAuditionId(long auditionId);
}
