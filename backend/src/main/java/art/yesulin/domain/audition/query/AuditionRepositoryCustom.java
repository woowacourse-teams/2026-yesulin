package art.yesulin.domain.audition.query;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AuditionRepositoryCustom {

    List<PerformanceManagementResult> findPerformances(long ownerId, Instant currentTime);

    Optional<PerformanceManagementResult> findPerformance(long ownerId, long performanceId, Instant currentTime);

    Optional<AuditionManagementListResult> findAuditions(
            long ownerId,
            long performanceId,
            Instant currentTime,
            AuditionSearchCondition condition
    );

    Optional<AuditionManagementResult> findAudition(long ownerId, UUID auditionId, Instant currentTime);
}
