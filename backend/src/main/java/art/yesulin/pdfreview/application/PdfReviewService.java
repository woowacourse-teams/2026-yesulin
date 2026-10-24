package art.yesulin.pdfreview.application;

import static art.yesulin.pdfreview.domain.PdfReviewErrorCode.PDF_REVIEW_ENTRY_NOT_FOUND;
import static art.yesulin.pdfreview.domain.PdfReviewErrorCode.PDF_REVIEW_NOT_FOUND;

import art.yesulin.global.exception.BusinessException;
import art.yesulin.pdfextraction.application.PdfExtractionService;
import art.yesulin.pdfextraction.application.PdfExtractionService.PreparedUpload;
import art.yesulin.pdfreview.domain.PdfReview;
import art.yesulin.pdfreview.domain.PdfReviewCount;
import art.yesulin.pdfreview.domain.PdfReviewDecision;
import art.yesulin.pdfreview.domain.PdfReviewEntry;
import art.yesulin.pdfreview.domain.PdfReviewEntryRepository;
import art.yesulin.pdfreview.domain.PdfReviewRepository;
import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "yesulin.pdf-extraction", name = "enabled", havingValue = "true")
public class PdfReviewService {

    private final PdfReviewRepository reviews;
    private final PdfReviewEntryRepository entries;
    private final PdfExtractionService extraction;
    private final Clock clock;

    @Transactional
    public PdfReviewDetail create(long ownerId, String title, List<String> roleNames) {
        PdfReview review = reviews.save(new PdfReview(ownerId, title, roleNames, clock.instant()));
        return PdfReviewDetail.of(review, List.of());
    }

    @Transactional(readOnly = true)
    public List<PdfReviewSummary> list(long ownerId) {
        List<PdfReview> owned = reviews.findByOwnerIdOrderByCreatedAtDesc(ownerId);
        List<String> ids = owned.stream().map(PdfReview::getId).toList();
        if (ids.isEmpty()) {
            return List.of();
        }
        Map<String, Long> roleCounts = toMap(reviews.countRolesByReviewIds(ids));
        Map<String, Long> entryCounts = toMap(entries.countByReviewIds(ids));
        return owned.stream()
                .map(review -> new PdfReviewSummary(review.getId(), review.getTitle(), review.getCreatedAt(),
                        roleCounts.getOrDefault(review.getId(), 0L), entryCounts.getOrDefault(review.getId(), 0L)))
                .toList();
    }

    @Transactional(readOnly = true)
    public PdfReviewDetail find(long ownerId, String reviewId) {
        PdfReview review = findOwned(ownerId, reviewId);
        return PdfReviewDetail.of(review, entries.findByReviewIdOrderByOriginalFilenameAscIdAsc(reviewId));
    }

    @Transactional
    public PreparedUpload prepareUpload(long ownerId, String reviewId, String filename, long size) {
        PdfReview review = findOwned(ownerId, reviewId);
        PreparedUpload upload = extraction.prepare(ownerId, review.getId(), filename, size);
        entries.save(new PdfReviewEntry(review.getId(), upload.jobId(), filename));
        return upload;
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public PdfReviewEntryView editEntry(long ownerId, String reviewId, String entryId, String memo,
                                        PdfReviewDecision decision) {
        findOwned(ownerId, reviewId);
        PdfReviewEntry entry = entries.findInReviewForUpdate(entryId, reviewId)
                .orElseThrow(() -> new BusinessException(PDF_REVIEW_ENTRY_NOT_FOUND, "지원 항목을 찾을 수 없습니다."));
        entry.review(memo, decision);
        return PdfReviewEntryView.of(entry);
    }

    private PdfReview findOwned(long ownerId, String reviewId) {
        return reviews.findByIdAndOwnerId(reviewId, ownerId)
                .orElseThrow(() -> new BusinessException(PDF_REVIEW_NOT_FOUND, "PDF 심사를 찾을 수 없습니다."));
    }

    private Map<String, Long> toMap(List<PdfReviewCount> counts) {
        return counts.stream().collect(Collectors.toMap(PdfReviewCount::reviewId, PdfReviewCount::count));
    }
}
