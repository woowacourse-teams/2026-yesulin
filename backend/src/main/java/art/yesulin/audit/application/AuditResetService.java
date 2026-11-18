package art.yesulin.audit.application;

import static art.yesulin.audit.domain.AuditErrorCode.PDF_REVIEW_RESET_BUSY;

import art.yesulin.audit.domain.Audit;
import art.yesulin.audit.domain.AuditApplicantRepository;
import art.yesulin.audit.domain.AuditRepository;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.pdfextraction.application.PdfExtractionStorage;
import art.yesulin.pdfextraction.domain.PdfExtractionJob;
import art.yesulin.pdfextraction.domain.PdfExtractionJobRepository;
import art.yesulin.pdfextraction.domain.PdfExtractionPayloadRepository;
import art.yesulin.pdfextraction.domain.ai.PdfAiJobRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Profile({"local", "dev"})
@RequiredArgsConstructor
@ConditionalOnExpression(AuditResetService.ENABLED)
public class AuditResetService {

    public static final String ENABLED =
            "${yesulin.pdf-extraction.enabled:false} and ${yesulin.pdf-review.reset-enabled:false}";

    private final AuditRepository reviews;
    private final AuditApplicantRepository entries;
    private final PdfExtractionJobRepository jobs;
    private final PdfExtractionPayloadRepository payloads;
    private final PdfAiJobRepository aiJobs;
    private final PdfExtractionStorage storage;
    private final Clock clock;

    @Transactional
    public AuditResetResult resetOwned(long ownerId) {
        List<Audit> owned = lockOwned(ownerId);
        List<List<PdfExtractionJob>> sources = owned.stream()
                .map(review -> jobs.findByReviewId(review.getId()))
                .toList();
        requireSettled(sources);
        long deletedEntries = 0;
        for (int index = 0; index < owned.size(); index++) {
            deletedEntries += remove(owned.get(index), sources.get(index));
        }
        return new AuditResetResult(owned.size(), deletedEntries);
    }

    private List<Audit> lockOwned(long ownerId) {
        return reviews.findByOwnerIdOrderByCreatedAtDesc(ownerId).stream()
                .map(review -> reviews.findOwnedForUpdate(review.getId(), ownerId).orElseThrow())
                .toList();
    }

    private void requireSettled(List<List<PdfExtractionJob>> sources) {
        Instant now = clock.instant();
        boolean busy = sources.stream().flatMap(List::stream).anyMatch(job -> job.isInProgress(now));
        if (busy) {
            throw new BusinessException(PDF_REVIEW_RESET_BUSY, "처리 중인 지원서가 있습니다. 처리가 끝난 뒤 다시 초기화해 주세요.");
        }
    }

    private long remove(Audit review, List<PdfExtractionJob> sources) {
        sources.forEach(storage::deleteAll);
        aiJobs.deleteByReviewId(review.getId());
        long deletedEntries = entries.deleteByReviewId(review.getId());
        removeSources(sources.stream().map(PdfExtractionJob::getId).toList());
        reviews.delete(review);
        return deletedEntries;
    }

    private void removeSources(List<String> jobIds) {
        payloads.deleteAllByIdInBatch(jobIds);
        jobs.deleteAllByIdInBatch(jobIds);
    }
}
