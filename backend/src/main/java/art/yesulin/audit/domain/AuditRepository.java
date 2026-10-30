package art.yesulin.audit.domain;

import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface AuditRepository extends JpaRepository<Audit, String> {

    Optional<Audit> findByIdAndOwnerId(String id, long ownerId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select review from Audit review where review.id = :id and review.ownerId = :ownerId")
    Optional<Audit> findOwnedForUpdate(String id, long ownerId);

    List<Audit> findByOwnerIdOrderByCreatedAtDesc(long ownerId);

    @Query("select new art.yesulin.audit.domain.AuditCount(item.review.id, count(item)) "
            + "from AuditRole item where item.review.id in :reviewIds group by item.review.id")
    List<AuditCount> countRolesByReviewIds(Collection<String> reviewIds);
}
