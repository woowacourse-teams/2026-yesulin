package art.yesulin.pdfextraction.domain;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface PdfExtractionJobRepository extends JpaRepository<PdfExtractionJob, String> {

    Optional<PdfExtractionJob> findByIdAndOwnerId(String id, long ownerId);

    List<PdfExtractionJob> findTop800ByOwnerIdOrderByCreatedAtDesc(long ownerId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select job from PdfExtractionJob job where job.id = :id and job.ownerId = :ownerId")
    Optional<PdfExtractionJob> findOwnedForUpdate(String id, long ownerId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select job from PdfExtractionJob job where job.id = :id")
    Optional<PdfExtractionJob> findForUpdate(String id);
}
