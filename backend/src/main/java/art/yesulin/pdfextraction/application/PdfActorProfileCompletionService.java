package art.yesulin.pdfextraction.application;

import art.yesulin.pdfextraction.domain.PdfExtractionJobRepository;
import java.time.Clock;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "yesulin.pdf-extraction", name = "enabled", havingValue = "true")
public class PdfActorProfileCompletionService {

    private final PdfExtractionJobRepository jobs;
    private final PdfExtractionService extraction;
    private final Clock clock;

    @Transactional
    public void finish(String jobId) {
        jobs.findForUpdate(jobId).filter(job -> job.isActorProfile() && !job.isDeleted() && !job.isFinished())
                .ifPresent(job -> {
                    PdfExtractionResult result = extraction.storedResult(job);
                    if (result == null) {
                        throw new IllegalStateException("Actor PDF extraction payload is missing");
                    }
                    job.receiveResult(result.status(), clock.instant());
                    job.recordDailyQuotaUse(result.hasProfileProposal());
                });
    }
}
