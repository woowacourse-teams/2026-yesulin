package art.yesulin.audit.application;

import art.yesulin.audit.domain.Audit;
import art.yesulin.audit.domain.AuditAiAnalyzer;
import art.yesulin.audit.domain.AuditAiProposal;
import art.yesulin.audit.domain.AuditAnalysis;
import art.yesulin.audit.domain.AuditAnalyzer;
import art.yesulin.audit.domain.AuditApplicant;
import art.yesulin.audit.domain.AuditApplicantRepository;
import art.yesulin.audit.domain.AuditRepository;
import art.yesulin.pdfextraction.application.PdfApplicantInfo;
import art.yesulin.pdfextraction.application.ai.PdfAiQueueService;
import art.yesulin.pdfextraction.application.ai.PdfAiRole;
import art.yesulin.pdfextraction.domain.ai.PdfAiJob;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "yesulin.pdf-extraction", name = "enabled", havingValue = "true")
public class AuditExtractionService {

    private final AuditRepository reviews;
    private final AuditApplicantRepository entries;
    private final PdfAiQueueService aiJobs;

    @Transactional
    public void startExtraction(String jobId) {
        entries.findByJobIdForUpdate(jobId).ifPresent(AuditApplicant::startExtraction);
    }

    @Transactional
    public void applyExtraction(String jobId, long ownerId, String text) {
        applyExtraction(jobId, ownerId, text, null);
    }

    @Transactional
    public void applyExtraction(String jobId, long ownerId, String text, PdfApplicantInfo applicantInfo) {
        entries.findByJobIdForUpdate(jobId).ifPresent(entry -> {
            Audit review = reviews.findByIdAndOwnerId(entry.getReviewId(), ownerId).orElse(null);
            if (review != null) {
                entry.applyAnalysis(analyze(text, review, applicantInfo));
                PdfAiJob aiJob = aiJobs.enqueue(jobId, review.getId(), ownerId, text, review.getRoles().stream()
                        .map(role -> new PdfAiRole(role.getId(), role.getName())).toList(), applicantInfo);
                applyProcessingStatus(entry, aiJob);
            }
        });
    }

    @Transactional
    public void applyAi(String jobId, long ownerId, String text, PdfApplicantInfo info) {
        entries.findByJobIdForUpdate(jobId).ifPresent(entry -> {
            Audit review = reviews.findByIdAndOwnerId(entry.getReviewId(), ownerId).orElseThrow();
            entry.applyAiAnalysis(analyze(text, review, info));
            entry.markReady();
        });
    }

    @Transactional
    public void applyAiFailure(String jobId) {
        entries.findByJobIdForUpdate(jobId).ifPresent(AuditApplicant::markNeedsReview);
    }

    @Transactional
    public void restartAnalysis(String jobId) {
        entries.findByJobIdForUpdate(jobId).ifPresent(AuditApplicant::markEnriching);
    }

    private void applyProcessingStatus(AuditApplicant entry, PdfAiJob aiJob) {
        switch (aiJob.getStatus()) {
            case PENDING, RUNNING -> entry.markEnriching();
            case COMPLETED -> entry.markReady();
            case FAILED -> entry.markNeedsReview();
            case SKIPPED -> applySkipped(entry, aiJob.getErrorCode());
            default -> throw new IllegalStateException("Unknown AI status");
        }
    }

    private void applySkipped(AuditApplicant entry, String reason) {
        switch (reason) {
            case "EXTRACTION_FAILED" -> entry.markFailed();
            case "LEGACY_COMPLETED" -> entry.markReady();
            default -> entry.markNeedsReview();
        }
    }

    private AuditAnalysis analyze(String text, Audit review, PdfApplicantInfo info) {
        if (info == null) {
            return AuditAnalyzer.analyze(text, review.getRoles());
        }
        return AuditAiAnalyzer.analyze(text, review.getRoles(), new AuditAiProposal(info.completed(),
                info.reason(), info.applicantName(), info.applicantNameEvidence(), info.roleId(),
                info.roleEvidence()));
    }
}
