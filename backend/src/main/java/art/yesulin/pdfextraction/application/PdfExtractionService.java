package art.yesulin.pdfextraction.application;

import static art.yesulin.pdfextraction.domain.PdfExtractionErrorCode.PDF_EXTRACTION_NOT_FOUND;

import art.yesulin.global.exception.BusinessException;
import art.yesulin.pdfextraction.domain.PdfExtractionJob;
import art.yesulin.pdfextraction.domain.PdfExtractionJobRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "yesulin.pdf-extraction", name = "enabled", havingValue = "true")
public class PdfExtractionService {

    private static final Duration UPLOAD_WINDOW = Duration.ofMinutes(10);
    private static final Duration DELAY_NOTICE_AFTER = Duration.ofMinutes(10);

    private final PdfExtractionJobRepository repository;
    private final PdfExtractionStorage storage;
    private final Clock clock;

    @Transactional
    public PreparedUpload prepare(long ownerId, String filename, long size) {
        Instant now = clock.instant();
        PdfExtractionJob job = new PdfExtractionJob(ownerId, filename, size, now, now.plus(UPLOAD_WINDOW));
        repository.save(job);
        return new PreparedUpload(job.getId(), storage.sourceFileKey(job), storage.prepare(job));
    }

    @Transactional
    public PdfExtractionView complete(long ownerId, String id) {
        PdfExtractionJob job = repository.findOwnedForUpdate(id, ownerId).orElseThrow(this::notFound);
        if (job.getUploadedAt() == null) {
            storage.verifySource(job);
            job.confirmUpload(clock.instant());
        }
        return PdfExtractionView.of(job, pendingStatus(job), storage, null);
    }

    @Transactional(readOnly = true)
    public List<PdfExtractionView> list(long ownerId) {
        // 목록은 DB 메타데이터만 읽는다. 최대 800개의 S3 결과를 한 요청에서 내려받지 않는다.
        return repository.findTop800ByOwnerIdOrderByCreatedAtDesc(ownerId).stream()
                .map(job -> PdfExtractionView.of(job, pendingStatus(job), storage, null, false))
                .toList();
    }

    @Transactional
    public PdfExtractionView find(long ownerId, String id, boolean includeResult) {
        PdfExtractionJob job = repository.findByIdAndOwnerId(id, ownerId).orElseThrow(this::notFound);
        if (job.getUploadedAt() == null || (job.getStatus().isFinal() && !includeResult)) {
            return PdfExtractionView.of(job, pendingStatus(job), storage, null, false);
        }
        Optional<PdfExtractionResult> result = storage.findResult(job);
        result.ifPresent(value -> job.finish(value.status()));
        return PdfExtractionView.of(job, result.map(PdfExtractionResult::status).orElse(pendingStatus(job)),
                storage, includeResult ? result.orElse(null) : null, includeResult);
    }

    private String pendingStatus(PdfExtractionJob job) {
        Instant now = clock.instant();
        if (job.getStatus().isFinal()) {
            return job.getStatus().name();
        }
        if (job.getUploadedAt() == null) {
            return now.isAfter(job.getUploadExpiresAt().plusSeconds(60)) ? "UPLOAD_EXPIRED" : "UPLOADING";
        }
        return now.isAfter(job.getUploadedAt().plus(DELAY_NOTICE_AFTER)) ? "DELAYED" : "QUEUED";
    }

    private BusinessException notFound() {
        return new BusinessException(PDF_EXTRACTION_NOT_FOUND, "PDF 추출 작업을 찾을 수 없습니다.");
    }

    public record PreparedUpload(String jobId, String fileKey, PdfExtractionStorage.UploadTarget upload) {
    }
}
