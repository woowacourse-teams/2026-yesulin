package art.yesulin.pdfextraction.application.ai;

import art.yesulin.pdfextraction.domain.PdfExtractionJob;
import art.yesulin.pdfextraction.domain.PdfExtractionJobRepository;
import art.yesulin.pdfextraction.domain.ai.PdfAiJob;
import art.yesulin.pdfextraction.domain.ai.PdfAiJobRepository;
import art.yesulin.pdfextraction.domain.ai.PdfAiStatus;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "yesulin.pdf-extraction", name = "enabled", havingValue = "true")
public class PdfAiFailureNoticeReader {

    private final PdfAiJobRepository jobs;
    private final PdfExtractionJobRepository sources;

    @Transactional(readOnly = true)
    public Optional<PdfAiFailureNotice> find(String jobId) {
        PdfAiJob job = jobs.findById(jobId).orElse(null);
        if (job == null || job.getStatus() != PdfAiStatus.FAILED) {
            return Optional.empty();
        }
        PdfExtractionJob source = sources.findById(jobId).orElse(null);
        return Optional.of(new PdfAiFailureNotice(jobId, job.getModelId(), job.getErrorCode(), job.getAttempts(),
                job.getUpdatedAt().toEpochMilli(), job.getRetryGeneration(), PdfAiRetryService.canRetry(job, source)));
    }
}
