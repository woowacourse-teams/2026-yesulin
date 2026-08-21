package art.yesulin.domain.audition.schedule;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuditionScheduleRepository extends JpaRepository<AuditionSchedule, Long> {

    Optional<AuditionSchedule> findByAuditionId(long auditionId);

    @Query("""
            select stage.id
            from ScreeningStage stage join stage.schedule schedule
            where schedule.auditionId = :auditionId and stage.order = :stageOrder
            """)
    Optional<Long> findStageIdByAuditionIdAndOrder(
            @Param("auditionId") long auditionId,
            @Param("stageOrder") int stageOrder
    );
}
