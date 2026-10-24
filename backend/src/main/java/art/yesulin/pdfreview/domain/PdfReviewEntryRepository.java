package art.yesulin.pdfreview.domain;

import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface PdfReviewEntryRepository extends JpaRepository<PdfReviewEntry, String> {

    List<PdfReviewEntry> findByReviewIdOrderByOriginalFilenameAscIdAsc(String reviewId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select item from PdfReviewEntry item where item.id = :id and item.reviewId = :reviewId")
    Optional<PdfReviewEntry> findInReviewForUpdate(String id, String reviewId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select item from PdfReviewEntry item where item.jobId = :jobId")
    Optional<PdfReviewEntry> findByJobIdForUpdate(String jobId);

    @Query("select new art.yesulin.pdfreview.domain.PdfReviewCount(item.reviewId, count(item)) "
            + "from PdfReviewEntry item where item.reviewId in :reviewIds group by item.reviewId")
    List<PdfReviewCount> countByReviewIds(Collection<String> reviewIds);
}
