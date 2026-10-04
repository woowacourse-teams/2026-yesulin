package art.yesulin.domain.timetable.request;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TimetableRequestRepository extends JpaRepository<TimetableRequest, Long> {

    List<TimetableRequest> findAllByTimetableIdAndStatusOrderByCreatedAtAscIdAsc(
            long timetableId,
            TimetableRequestStatus status
    );

    Optional<TimetableRequest> findFirstByActorIdAndStatus(long actorId, TimetableRequestStatus status);

    List<TimetableRequest> findAllByActorIdInAndStatus(Collection<Long> actorIds, TimetableRequestStatus status);

    void deleteAllByActorId(long actorId);
}
