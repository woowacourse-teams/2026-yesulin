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
    List<PdfAiJob> findByStatusAndNextAttemptAtLessThanEqualOrderByNextAttemptAtAscCreatedAtAsc(
            PdfAiStatus status, Instant now, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select job from PdfAiJob job where job.jobId = :jobId")
    Optional<PdfAiJob> findForUpdate(String jobId);
}
