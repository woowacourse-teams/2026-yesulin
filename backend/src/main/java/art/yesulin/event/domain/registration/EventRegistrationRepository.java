package art.yesulin.event.domain.registration;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
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

    Optional<EventRegistration> findByBusinessCardKey(String businessCardKey);

    @Query("select registration.eventId from EventRegistration registration where registration.businessCardKey = :key")
    Optional<Long> findEventIdByBusinessCardKey(@Param("key") String key);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select registration from EventRegistration registration where registration.businessCardKey = :key")
    Optional<EventRegistration> findByBusinessCardKeyForUpdate(@Param("key") String key);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select registration from EventRegistration registration where registration.id = :id")
    Optional<EventRegistration> findByIdForUpdate(@Param("id") long id);
}
