package art.yesulin.community.domain;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface CommunityReportRepository extends JpaRepository<CommunityReport, Long> {

    Optional<CommunityReport> findByRequestKey(String requestKey);

    List<CommunityReport> findAllByEntryId(long entryId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from CommunityReport r where r.id = :id")
    Optional<CommunityReport> lockById(long id);

    @Query("select r.id from CommunityReport r where r.notification = true and r.deliveredAt is null "
            + "and r.nextAttemptAt <= :now order by r.nextAttemptAt, r.id")
    List<Long> pending(Instant now, Pageable pageable);
}
