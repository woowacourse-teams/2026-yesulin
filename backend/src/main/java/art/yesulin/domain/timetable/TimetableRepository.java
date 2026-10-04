package art.yesulin.domain.timetable;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TimetableRepository extends JpaRepository<Timetable, Long> {

    Optional<Timetable> findByManageKey(TimetableKey manageKey);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select timetable from Timetable timetable where timetable.manageKey = :manageKey")
    Optional<Timetable> findByManageKeyForUpdate(@Param("manageKey") TimetableKey manageKey);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select timetable from Timetable timetable where timetable.id = :id")
    Optional<Timetable> findByIdForUpdate(@Param("id") long id);
}
