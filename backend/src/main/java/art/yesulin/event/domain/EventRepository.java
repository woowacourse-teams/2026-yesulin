package art.yesulin.event.domain;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EventRepository extends JpaRepository<Event, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select event from Event event where event.id = :id")
    Optional<Event> findByIdForUpdate(@Param("id") long id);

    List<Event> findAllByOrderByIdDesc(Pageable pageable);

    List<Event> findAllByStatusOrderByIdDesc(EventStatus status, Pageable pageable);

    List<Event> findAllByStatusAndBannerEnabledTrue(EventStatus status);
}
