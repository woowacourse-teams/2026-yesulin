package art.yesulin.pdfextraction.application;

import static art.yesulin.pdfextraction.domain.PdfExtractionErrorCode.INVALID_PDF_EXTRACTION_RESULT;
import static art.yesulin.pdfextraction.domain.PdfExtractionErrorCode.PDF_EXTRACTION_NOT_FOUND;
import static art.yesulin.pdfextraction.domain.PdfExtractionErrorCode.PDF_EXTRACTION_RESULT_CONFLICT;

import art.yesulin.global.exception.BusinessException;
import art.yesulin.pdfextraction.domain.DocumentPreviewStatus;
import art.yesulin.pdfextraction.domain.PdfExtractionJob;
import art.yesulin.pdfextraction.domain.PdfExtractionJobRepository;
import java.time.Clock;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "yesulin.pdf-extraction", name = "enabled", havingValue = "true")
public class DocumentPreviewReceiver {

    private final PdfExtractionJobRepository jobs;
    private final PdfExtractionStorage storage;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    @Transactional
    public void receive(DocumentPreviewCompletion completion) {
        PdfExtractionJob job = jobs.findForUpdate(completion.jobId()).filter(item -> !item.isDeleted())
                .orElseThrow(() -> new BusinessException(PDF_EXTRACTION_NOT_FOUND, "지원서를 찾을 수 없습니다."));
        validate(job, completion);
        if (job.previewStatus() != DocumentPreviewStatus.PENDING) {
            verifyReplay(job, completion);
            return;
        }
        if (completion.status() == DocumentPreviewStatus.FAILED) {
            job.receiveResult("FAILED", clock.instant());
            events.publishEvent(new DocumentPreviewFailedEvent(job.getId()));
            return;
        }
        storage.verifyPreview(job, completion.previewSha256());
        boolean firstConfirmation = job.getUploadedAt() == null;
        job.acceptPreview(completion.previewSha256(), clock.instant());
        if (firstConfirmation) {
            events.publishEvent(new PdfExtractionUploadedEvent(job.getId()));
        }
    }

    private void validate(PdfExtractionJob job, DocumentPreviewCompletion completion) {
        if (!job.requiresConversion() || !storage.sourceFileKey(job).equals(completion.originalFileKey())
                || !Objects.equals(job.getSourceSha256(), completion.originalSha256()) || !validResult(completion)) {
            throw new BusinessException(INVALID_PDF_EXTRACTION_RESULT, "지원서 변환 작업 정보가 일치하지 않습니다.");
        }
    }

    private boolean validResult(DocumentPreviewCompletion completion) {
        if (completion.status() == DocumentPreviewStatus.FAILED) {
            return completion.previewSha256() == null;
        }
        return completion.status() == DocumentPreviewStatus.READY && completion.previewSha256() != null
                && completion.previewSha256().matches("[0-9a-f]{64}");
    }

    private void verifyReplay(PdfExtractionJob job, DocumentPreviewCompletion completion) {
        if (job.previewStatus() != completion.status()
                || !Objects.equals(job.getPreviewSha256(), completion.previewSha256())) {
            throw new BusinessException(PDF_EXTRACTION_RESULT_CONFLICT, "다른 변환 결과가 이미 저장되었습니다.");
        }
    }
}
