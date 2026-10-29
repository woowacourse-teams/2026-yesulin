package art.yesulin.event.domain.registration;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EventRegistrationRepository extends JpaRepository<EventRegistration, Long> {

    boolean existsByEventIdAndPhone(long eventId, String phone);

    List<EventRegistration> findAllByEventIdOrderByIdAsc(long eventId);

    long countByEventId(long eventId);

    @Query("select registration.eventId as eventId, count(registration.id) as total "
            + "from EventRegistration registration where registration.eventId in :eventIds "
            + "group by registration.eventId")
    List<RegistrationCount> countForEventIds(@Param("eventIds") List<Long> eventIds);

    interface RegistrationCount {
        Long getEventId();

        Long getTotal();
    }
}
