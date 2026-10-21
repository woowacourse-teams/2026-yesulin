package art.yesulin.event.domain;

import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventRepository extends JpaRepository<Event, Long> {

    List<Event> findAllByOrderByIdDesc(Pageable pageable);

    List<Event> findAllByStatusOrderByIdDesc(EventStatus status, Pageable pageable);

    List<Event> findAllByStatusAndBannerEnabledTrue(EventStatus status);
}
