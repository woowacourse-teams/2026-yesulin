package art.yesulin.pdfreview.application;

import static art.yesulin.pdfextraction.domain.PdfExtractionErrorCode.PDF_EXTRACTION_NOT_FOUND;
import static art.yesulin.pdfreview.domain.PdfReviewErrorCode.PDF_REVIEW_NOT_FOUND;

import art.yesulin.global.exception.BusinessException;
import art.yesulin.pdfextraction.application.PdfExtractionStorage;
import art.yesulin.pdfextraction.domain.PdfExtractionJob;
import art.yesulin.pdfextraction.domain.PdfExtractionJobRepository;
import art.yesulin.pdfreview.domain.PdfReview;
import art.yesulin.pdfreview.domain.PdfReviewRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "yesulin.pdf-extraction", name = "enabled", havingValue = "true")
public class PdfReviewWorkerContextService {

    private final PdfExtractionJobRepository jobs;
    private final PdfReviewRepository reviews;
    private final PdfExtractionStorage storage;

    @Transactional(readOnly = true)
    public PdfReviewWorkerContext find(String jobId) {
        PdfExtractionJob job = jobs.findById(jobId).orElseThrow(() ->
                new BusinessException(PDF_EXTRACTION_NOT_FOUND, "PDF 추출 작업을 찾을 수 없습니다."));
        String sourceFileKey = storage.sourceFileKey(job);
        if (job.getReviewId() == null) {
            return new PdfReviewWorkerContext(job.getId(), null, sourceFileKey, job.isFinished(), List.of());
        }
        PdfReview review = reviews.findByIdAndOwnerId(job.getReviewId(), job.getOwnerId()).orElseThrow(() ->
                new BusinessException(PDF_REVIEW_NOT_FOUND, "PDF 심사를 찾을 수 없습니다."));
        List<PdfReviewWorkerContext.Role> roles = review.getRoles().stream()
                .map(role -> new PdfReviewWorkerContext.Role(role.getId(), role.getName()))
                .toList();
        return new PdfReviewWorkerContext(job.getId(), review.getId(), sourceFileKey, job.isFinished(), roles);
    }
}
