package art.yesulin.pdfextraction.domain.ai;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface PdfAiJobRepository extends JpaRepository<PdfAiJob, String> {

    long countByStatusAndLeaseExpiresAtAfter(PdfAiStatus status, Instant now);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<PdfAiJob> findByStatusAndLeaseExpiresAtLessThanEqual(PdfAiStatus status, Instant now, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select job from PdfAiJob job where job.status = :status and job.nextAttemptAt <= :now "
            + "and job.escalationPending = :escalated order by job.nextAttemptAt, job.createdAt")
    List<PdfAiJob> findEligible(PdfAiStatus status, Instant now, boolean escalated, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select job from PdfAiJob job where job.jobId = :jobId")
    Optional<PdfAiJob> findForUpdate(String jobId);
}
