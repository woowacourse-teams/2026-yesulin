package art.yesulin.pdfextraction.application.ai;

import static art.yesulin.pdfextraction.domain.PdfExtractionErrorCode.PDF_EXTRACTION_NOT_FOUND;

import art.yesulin.global.exception.BusinessException;
import art.yesulin.pdfextraction.domain.PdfExtractionJob;
import art.yesulin.pdfextraction.domain.PdfExtractionJobRepository;
import art.yesulin.pdfextraction.domain.PdfExtractionPayloadRepository;
import art.yesulin.pdfextraction.domain.PdfExtractionPurpose;
import art.yesulin.pdfextraction.domain.PdfExtractionStatus;
import art.yesulin.pdfextraction.domain.ai.PdfAiJob;
import art.yesulin.pdfextraction.domain.ai.PdfAiJobRepository;
import art.yesulin.pdfextraction.domain.ai.PdfAiStatus;
import java.time.Clock;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "yesulin.pdf-extraction", name = "enabled", havingValue = "true")
public class PdfAiRetryService {

    private final PdfAiJobRepository jobs;
    private final PdfExtractionJobRepository sources;
    private final PdfExtractionPayloadRepository payloads;
    private final PdfAiProperties properties;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    @Transactional
    public Result request(PdfAiRetryRequest request, long actorMemberId, boolean administrator) {
        if (!properties.enabled()) {
            return Result.DISABLED;
        }
        PdfAiJob job = jobs.findForUpdate(request.jobId()).orElse(null);
        if (job == null || (!administrator && job.getOwnerId() != actorMemberId)) {
            throw new BusinessException(PDF_EXTRACTION_NOT_FOUND, "재분석할 지원서를 찾을 수 없습니다.");
        }
        if (job.getStatus() == PdfAiStatus.PENDING || job.getStatus() == PdfAiStatus.RUNNING) {
            return Result.ALREADY_PROCESSING;
        }
        PdfExtractionJob source = sources.findById(job.getJobId()).orElse(null);
        if (!canRetry(job, source) || !payloads.existsById(job.getJobId())
                || !job.requestRetry(request.failedAttempts(), request.failedAt(), request.generation(),
                clock.instant())) {
            return Result.UNAVAILABLE;
        }
        events.publishEvent(new PdfAiRetriedEvent(job.getJobId(), job.getOwnerId()));
        events.publishEvent(new PdfAiQueuedEvent(job.getJobId()));
        return Result.QUEUED;
    }

    static boolean canRetry(PdfAiJob job, PdfExtractionJob source) {
        return job.getReviewId() != null && source != null && source.getPurpose() == PdfExtractionPurpose.PDF_REVIEW
                && !source.isDeleted() && source.isFinished() && source.getStatus() != PdfExtractionStatus.FAILED
                && source.getOwnerId() == job.getOwnerId() && job.getReviewId().equals(source.getReviewId());
    }

    public enum Result {
        QUEUED, ALREADY_PROCESSING, UNAVAILABLE, DISABLED
    }
}
