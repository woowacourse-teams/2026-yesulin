package art.yesulin.audit.application;

import art.yesulin.audit.domain.Audit;
import art.yesulin.audit.domain.AuditApplicantRepository;
import art.yesulin.audit.domain.AuditRepository;
import art.yesulin.pdfextraction.application.PdfExtractionStorage;
import art.yesulin.pdfextraction.domain.PdfExtractionJob;
import art.yesulin.pdfextraction.domain.PdfExtractionJobRepository;
import art.yesulin.pdfextraction.domain.PdfExtractionPayloadRepository;
import art.yesulin.pdfextraction.domain.ai.PdfAiJobRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@ConditionalOnExpression("${yesulin.pdf-extraction.enabled:false} and ${yesulin.pdf-review.reset-enabled:false}")
public class AuditResetService {

    private final AuditRepository reviews;
    private final AuditApplicantRepository entries;
    private final PdfExtractionJobRepository jobs;
    private final PdfExtractionPayloadRepository payloads;
    private final PdfAiJobRepository aiJobs;
    private final PdfExtractionStorage storage;

    @Transactional
    public AuditResetResult resetOwned(long ownerId) {
        List<Audit> owned = reviews.findByOwnerIdOrderByCreatedAtDesc(ownerId);
        long deletedEntries = owned.stream().mapToLong(this::remove).sum();
        return new AuditResetResult(owned.size(), deletedEntries);
    }

    private long remove(Audit review) {
        List<PdfExtractionJob> sources = jobs.findByReviewId(review.getId());
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
