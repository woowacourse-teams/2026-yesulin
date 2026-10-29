package art.yesulin.pdfextraction.domain;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface PdfExtractionJobRepository extends JpaRepository<PdfExtractionJob, String> {

    Optional<PdfExtractionJob> findByIdAndOwnerIdAndPurpose(String id, long ownerId, PdfExtractionPurpose purpose);

    List<PdfExtractionJob> findTop800ByOwnerIdAndPurposeOrderByCreatedAtDesc(
            long ownerId, PdfExtractionPurpose purpose
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select job from PdfExtractionJob job
            where job.id = :id and job.ownerId = :ownerId and job.purpose = :purpose
            """)
    Optional<PdfExtractionJob> findOwnedForUpdate(String id, long ownerId, PdfExtractionPurpose purpose);

    /** 배우 가져오기의 진행 중 작업과 하루 1회 집계에 쓴다. 지운 작업도 하루 1회에는 그대로 센다. */
    List<PdfExtractionJob> findAllByOwnerIdAndPurposeAndCreatedAtGreaterThanEqual(
            long ownerId, PdfExtractionPurpose purpose, Instant from
    );

    /** 24시간이 지난 배우 가져오기 결과. 결과가 없는 작업은 만든 지 24시간이 지나면 함께 지운다. */
    @Query("""
            select job from PdfExtractionJob job
            where job.purpose = :purpose and job.deletedAt is null
              and ((job.finishedAt is not null and job.finishedAt < :before)
                or (job.finishedAt is null and job.createdAt < :before))
            order by job.createdAt
            """)
    List<PdfExtractionJob> findExpired(PdfExtractionPurpose purpose, Instant before, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select job from PdfExtractionJob job where job.id = :id")
    Optional<PdfExtractionJob> findForUpdate(String id);
}
