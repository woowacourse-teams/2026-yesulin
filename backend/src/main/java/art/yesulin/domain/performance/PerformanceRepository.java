package art.yesulin.domain.performance;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PerformanceRepository extends JpaRepository<Performance, Long> {

    List<Performance> findAllByOwnerIdOrderByCreatedAtDesc(long ownerId);

    Optional<Performance> findByIdAndOwnerId(long id, long ownerId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select performance from Performance performance
            where performance.id = :id and performance.ownerId = :ownerId
            """)
    Optional<Performance> findByIdAndOwnerIdForUpdate(@Param("id") long id, @Param("ownerId") long ownerId);

    boolean existsByIdAndOwnerId(long id, long ownerId);
}
