package art.yesulin.audit.application;

import static art.yesulin.audit.domain.AuditErrorCode.INVALID_PDF_REVIEW;
import static art.yesulin.audit.domain.AuditErrorCode.PDF_REVIEW_ENTRY_NOT_FOUND;
import static art.yesulin.audit.domain.AuditErrorCode.PDF_REVIEW_NOT_FOUND;

import art.yesulin.audit.domain.Audit;
import art.yesulin.audit.domain.AuditApplicant;
import art.yesulin.audit.domain.AuditApplicantRepository;
import art.yesulin.audit.domain.AuditCount;
import art.yesulin.audit.domain.AuditDecision;
import art.yesulin.audit.domain.AuditRepository;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.pdfextraction.application.PdfExtractionService;
import art.yesulin.pdfextraction.application.PdfExtractionService.PreparedUpload;
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
public class AuditService {

    private final AuditRepository reviews;
    private final AuditApplicantRepository entries;
    private final PdfExtractionService extraction;
    private final Clock clock;

    @Transactional
    public AuditDetail create(long ownerId, String title, List<String> roleNames) {
        Audit review = reviews.save(new Audit(ownerId, title, roleNames, clock.instant()));
        return AuditDetail.of(review, List.of());
    }

    @Transactional(readOnly = true)
    public List<AuditSummary> list(long ownerId) {
        List<Audit> owned = reviews.findByOwnerIdOrderByCreatedAtDesc(ownerId);
        List<String> ids = owned.stream().map(Audit::getId).toList();
        if (ids.isEmpty()) {
            return List.of();
        }
        Map<String, Long> roleCounts = toMap(reviews.countRolesByReviewIds(ids));
        Map<String, Long> entryCounts = toMap(entries.countByReviewIds(ids));
        return owned.stream()
                .map(review -> new AuditSummary(review.getId(), review.getTitle(), review.getCreatedAt(),
                        roleCounts.getOrDefault(review.getId(), 0L), entryCounts.getOrDefault(review.getId(), 0L)))
                .toList();
    }

    @Transactional(readOnly = true)
    public AuditDetail find(long ownerId, String reviewId) {
        Audit review = findOwned(ownerId, reviewId);
        return AuditDetail.of(review, entries.findByReviewIdOrderByOriginalFilenameAscIdAsc(reviewId));
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public PreparedUpload prepareUpload(long ownerId, String reviewId, String filename, long size, String sha256) {
        Audit review = reviews.findOwnedForUpdate(reviewId, ownerId).orElseThrow(() ->
                new BusinessException(PDF_REVIEW_NOT_FOUND, "PDF 심사를 찾을 수 없습니다."));
        PreparedUpload upload = extraction.prepareReview(ownerId, review.getId(), filename, size, sha256);
        if (!upload.duplicate()) {
            if (entries.countByReviewId(review.getId()) >= 800) {
                throw new BusinessException(INVALID_PDF_REVIEW, "한 심사에는 최대 800개까지 올릴 수 있습니다.");
            }
            entries.save(new AuditApplicant(review.getId(), upload.jobId(), filename));
        }
        return upload;
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public AuditApplicantView editEntry(long ownerId, String reviewId, String entryId, String memo,
                                        AuditDecision decision) {
        findOwned(ownerId, reviewId);
        AuditApplicant entry = entries.findInReviewForUpdate(entryId, reviewId)
                .orElseThrow(() -> new BusinessException(PDF_REVIEW_ENTRY_NOT_FOUND, "지원 항목을 찾을 수 없습니다."));
        entry.review(memo, decision);
        return AuditApplicantView.of(entry);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public List<AuditApplicantView> assignRoles(long ownerId, String reviewId, List<String> entryIds, String roleId) {
        Audit review = findOwned(ownerId, reviewId);
        if (entryIds == null || entryIds.isEmpty() || entryIds.size() > 300
                || entryIds.stream().anyMatch(java.util.Objects::isNull)
                || entryIds.stream().distinct().count() != entryIds.size()
                || (roleId != null && review.getRoles().stream().noneMatch(role -> role.getId().equals(roleId)))) {
            throw new BusinessException(art.yesulin.audit.domain.AuditErrorCode.INVALID_PDF_REVIEW,
                    "이 심사의 지원자와 배역을 선택해 주세요.");
        }
        return entryIds.stream().sorted().map(id -> {
            AuditApplicant entry = entries.findInReviewForUpdate(id, reviewId)
                    .orElseThrow(() -> new BusinessException(PDF_REVIEW_ENTRY_NOT_FOUND, "지원 항목을 찾을 수 없습니다."));
            entry.assignRole(roleId);
            return AuditApplicantView.of(entry);
        }).toList();
    }

    private Audit findOwned(long ownerId, String reviewId) {
        return reviews.findByIdAndOwnerId(reviewId, ownerId)
                .orElseThrow(() -> new BusinessException(PDF_REVIEW_NOT_FOUND, "PDF 심사를 찾을 수 없습니다."));
    }

    private Map<String, Long> toMap(List<AuditCount> counts) {
        return counts.stream().collect(Collectors.toMap(AuditCount::reviewId, AuditCount::count));
    }
}
