package art.yesulin.event.domain.registration;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventRegistrationRepository extends JpaRepository<EventRegistration, Long> {

    boolean existsByEventIdAndPhone(long eventId, String phone);

    List<EventRegistration> findAllByEventIdOrderByIdAsc(long eventId);

    long countByEventId(long eventId);
}
