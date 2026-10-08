package art.yesulin.timetable.domain.message;

import java.util.Collection;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TimetableMessageRepository extends JpaRepository<TimetableMessage, Long> {

    boolean existsByActorIdAndStatusAndTypeIn(
            long actorId,
            TimetableMessageStatus status,
            Collection<TimetableMessageType> types
    );

    boolean existsByTimetableIdAndStatusAndType(
            long timetableId,
            TimetableMessageStatus status,
            TimetableMessageType type
    );

    List<TimetableMessage> findAllByStatusOrderByCreatedAtAscIdAsc(TimetableMessageStatus status, Pageable pageable);

    List<TimetableMessage> findAllByStatusOrderBySentAtDescIdDesc(TimetableMessageStatus status, Pageable pageable);

    long countByStatus(TimetableMessageStatus status);

    void deleteAllByActorIdAndStatus(long actorId, TimetableMessageStatus status);
}
