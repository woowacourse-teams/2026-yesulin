package art.yesulin.audit.domain;

import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface AuditApplicantRepository extends JpaRepository<AuditApplicant, String> {

    List<AuditApplicant> findByReviewIdOrderByOriginalFilenameAscIdAsc(String reviewId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select item from AuditApplicant item where item.id = :id and item.reviewId = :reviewId")
    Optional<AuditApplicant> findInReviewForUpdate(String id, String reviewId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select item from AuditApplicant item where item.jobId = :jobId")
    Optional<AuditApplicant> findByJobIdForUpdate(String jobId);

    @Query("select new art.yesulin.audit.domain.AuditCount(item.reviewId, count(item)) "
            + "from AuditApplicant item where item.reviewId in :reviewIds group by item.reviewId")
    List<AuditCount> countByReviewIds(Collection<String> reviewIds);
}
