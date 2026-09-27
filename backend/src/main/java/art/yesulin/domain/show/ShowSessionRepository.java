package art.yesulin.domain.show;

import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ShowSessionRepository extends JpaRepository<ShowSession, Long> {

    List<ShowSession> findAllByShowIdOrderByStartsAtAscIdAsc(long showId);

    List<ShowSession> findAllByShowIdInOrderByStartsAtAscIdAsc(Collection<Long> showIds);

    Optional<ShowSession> findByIdAndShowId(long id, long showId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select session from ShowSession session where session.id = :id")
    Optional<ShowSession> findByIdForUpdate(@Param("id") long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select session from ShowSession session where session.showId = :showId order by session.id asc")
    List<ShowSession> findAllByShowIdForUpdate(@Param("showId") long showId);
}
