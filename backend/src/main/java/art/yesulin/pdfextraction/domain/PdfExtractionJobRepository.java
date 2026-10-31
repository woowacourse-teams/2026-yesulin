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

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<PdfExtractionJob> findByReviewIdAndSourceSha256(String reviewId, String sourceSha256);

    boolean existsByReviewIdAndSourceSha256(String reviewId, String sourceSha256);

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

    /** 정리 후보는 ID만 읽어 AI → 원본 행 순서로 잠그기 전의 오래된 엔티티를 보관하지 않는다. */
    @Query("""
            select job.id from PdfExtractionJob job
            where job.purpose = :purpose and job.deletedAt is null
              and ((job.finishedAt is not null and job.finishedAt < :before)
                or (job.finishedAt is null and job.createdAt < :before))
            order by job.createdAt
            """)
    List<String> findExpiredIds(PdfExtractionPurpose purpose, Instant before, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select job from PdfExtractionJob job where job.id = :id")
    Optional<PdfExtractionJob> findForUpdate(String id);
}
