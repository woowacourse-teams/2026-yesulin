package art.yesulin.pdfreview.application;

import art.yesulin.pdfreview.domain.PdfReview;
import art.yesulin.pdfreview.domain.PdfReviewAnalyzer;
import art.yesulin.pdfreview.domain.PdfReviewEntryRepository;
import art.yesulin.pdfreview.domain.PdfReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "yesulin.pdf-extraction", name = "enabled", havingValue = "true")
public class PdfReviewExtractionService {

    private final PdfReviewRepository reviews;
    private final PdfReviewEntryRepository entries;

    @Transactional
    public void applyExtraction(String jobId, long ownerId, String text) {
        entries.findByJobIdForUpdate(jobId).ifPresent(entry -> {
            PdfReview review = reviews.findByIdAndOwnerId(entry.getReviewId(), ownerId).orElse(null);
            if (review != null) {
                entry.applyAnalysis(PdfReviewAnalyzer.analyze(text, review.getRoles()));
            }
        });
    }
}
