package art.yesulin.pdfextraction.application;

import static art.yesulin.pdfextraction.domain.PdfExtractionErrorCode.PDF_EXTRACTION_NOT_FOUND;

import art.yesulin.global.exception.BusinessException;
import art.yesulin.pdfextraction.domain.PdfExtractionJob;
import art.yesulin.pdfextraction.domain.PdfExtractionJobRepository;
import art.yesulin.pdfextraction.domain.PdfExtractionPayloadRepository;
import art.yesulin.pdfextraction.domain.PdfExtractionPurpose;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "yesulin.pdf-extraction", name = "enabled", havingValue = "true")
public class PdfExtractionService {

    private static final Duration UPLOAD_WINDOW = Duration.ofMinutes(10);
    private static final Duration DELAY_NOTICE_AFTER = Duration.ofMinutes(10);

    /** 공연사 API는 공연사 심사 작업만 본다. 배우 프로필 가져오기는 배우 API가 따로 다룬다. */
    private static final PdfExtractionPurpose REVIEW = PdfExtractionPurpose.PDF_REVIEW;

    private final PdfExtractionJobRepository repository;
    private final PdfExtractionPayloadRepository payloads;
    private final PdfExtractionStorage storage;
    private final ObjectMapper mapper;
    private final Clock clock;

    @Transactional
    public PreparedUpload prepare(long ownerId, String filename, long size) {
        return prepare(ownerId, null, filename, size);
    }

    @Transactional
    public PreparedUpload prepare(long ownerId, String reviewId, String filename, long size) {
        Instant now = clock.instant();
        PdfExtractionJob job = new PdfExtractionJob(ownerId, filename, size, now, now.plus(UPLOAD_WINDOW), reviewId);
        repository.save(job);
        return new PreparedUpload(job.getId(), storage.sourceFileKey(job), storage.prepare(job));
    }

    @Transactional
    public PdfExtractionView complete(long ownerId, String id) {
        PdfExtractionJob job = repository.findOwnedForUpdate(id, ownerId, REVIEW).orElseThrow(this::notFound);
        if (job.getUploadedAt() == null) {
            storage.verifySource(job);
            job.confirmUpload(clock.instant());
        }
        return PdfExtractionView.of(job, pendingStatus(job), storage, null, false);
    }

    @Transactional(readOnly = true)
    public List<PdfExtractionView> list(long ownerId) {
        // 목록은 DB 메타데이터만 읽는다. 최대 800개의 S3 결과를 한 요청에서 내려받지 않는다.
        return repository.findTop800ByOwnerIdAndPurposeOrderByCreatedAtDesc(ownerId, REVIEW).stream()
                .map(job -> PdfExtractionView.of(job, pendingStatus(job), storage, null, false))
                .toList();
    }

    @Transactional(readOnly = true)
    public PdfExtractionView find(long ownerId, String id, boolean includeResult) {
        PdfExtractionJob job = repository.findByIdAndOwnerIdAndPurpose(id, ownerId, REVIEW).orElseThrow(this::notFound);
        PdfExtractionResult result = includeResult && job.isFinished() ? storedResult(job) : null;
        return PdfExtractionView.of(job, pendingStatus(job), storage, result, includeResult);
    }

    /** 저장한 결과를 서명한 이미지 주소와 함께 읽는다. 결과가 없으면 null이다. 배우 프로필 가져오기도 같은 결과를 읽는다. */
    public PdfExtractionResult storedResult(PdfExtractionJob job) {
        return payloads.findById(job.getId())
                .map(payload -> mapper.readValue(payload.getPayloadJson(), PdfExtractionResult.class))
                .map(result -> result.withImageUrls(fileKey -> storage.imageUrl(job, fileKey)))
                .orElse(null);
    }

    /** 화면에 보일 상태. 업로드 만료와 10분 넘게 결과가 없는 대기를 따로 알려 준다. */
    public String pendingStatus(PdfExtractionJob job) {
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
