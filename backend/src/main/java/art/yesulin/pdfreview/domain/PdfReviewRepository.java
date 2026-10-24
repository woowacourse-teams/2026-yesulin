package art.yesulin.pdfreview.domain;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface PdfReviewRepository extends JpaRepository<PdfReview, String> {

    Optional<PdfReview> findByIdAndOwnerId(String id, long ownerId);

    List<PdfReview> findByOwnerIdOrderByCreatedAtDesc(long ownerId);

    @Query("select new art.yesulin.pdfreview.domain.PdfReviewCount(item.review.id, count(item)) "
            + "from PdfReviewRole item where item.review.id in :reviewIds group by item.review.id")
    List<PdfReviewCount> countRolesByReviewIds(Collection<String> reviewIds);
}
