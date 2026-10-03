package art.yesulin.domain.timetable;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TimetableActorRepository extends JpaRepository<TimetableActor, Long> {

    /** 배우를 영속성 컨텍스트에 올리지 않고 일정표 ID만 읽는다. 일정표를 잠근 뒤 배우를 새로 읽기 위해 쓴다. */
    @Query("select actor.timetableId from TimetableActor actor where actor.accessKey = :accessKey")
    Optional<Long> findTimetableIdByAccessKey(@Param("accessKey") String accessKey);

    Optional<TimetableActor> findByAccessKey(String accessKey);

    List<TimetableActor> findAllByTimetableIdOrderByIdAsc(long timetableId);
}
