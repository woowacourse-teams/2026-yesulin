package art.yesulin.pdfextraction.application;

import static art.yesulin.pdfextraction.domain.PdfExtractionErrorCode.INVALID_PDF;
import static art.yesulin.pdfextraction.domain.PdfExtractionErrorCode.PDF_EXTRACTION_NOT_FOUND;

import art.yesulin.global.exception.BusinessException;
import art.yesulin.pdfextraction.domain.PdfExtractionJob;
import art.yesulin.pdfextraction.domain.PdfExtractionJobRepository;
import art.yesulin.pdfextraction.domain.PdfExtractionPayloadRepository;
import art.yesulin.pdfextraction.domain.PdfExtractionPurpose;
import art.yesulin.pdfextraction.domain.ai.PdfAiJob;
import art.yesulin.pdfextraction.domain.ai.PdfAiJobRepository;
import art.yesulin.pdfextraction.domain.ai.PdfAiStatus;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.ApplicationEventPublisher;
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
    private final PdfAiJobRepository aiJobs;
    private final ApplicationEventPublisher events;

    @Transactional
    public PreparedUpload prepare(long ownerId, String filename, long size) {
        return prepare(ownerId, null, filename, size);
    }

    @Transactional
    public PreparedUpload prepare(long ownerId, String reviewId, String filename, long size) {
        Instant now = clock.instant();
        PdfExtractionJob job = new PdfExtractionJob(ownerId, filename, size, now, now.plus(UPLOAD_WINDOW), reviewId);
        job.identifySource(storage.sourceFileKey(job));
        repository.save(job);
        return new PreparedUpload(job.getId(), storage.sourceFileKey(job), storage.prepare(job));
    }

    /** 호출자는 본인 심사 행을 잠근다. 동일 원본은 기존 항목과 작업을 그대로 재사용한다. */
    @Transactional
    public PreparedUpload prepareReview(long ownerId, String reviewId, String filename, long size, String sha256) {
        Instant now = clock.instant();
        PdfExtractionJob candidate = new PdfExtractionJob(ownerId, filename, size, now,
                now.plus(UPLOAD_WINDOW), reviewId);
        candidate.identifySourceSha256(sha256);
        PdfExtractionJob existing = repository.findByReviewIdAndSourceSha256(reviewId, sha256).orElse(null);
        if (existing != null) {
            if (existing.getOwnerId() != ownerId || existing.getSize() != size) {
                throw new BusinessException(INVALID_PDF, "기존 PDF와 업로드 정보가 일치하지 않습니다.");
            }
            if (existing.getUploadedAt() != null || existing.isFinished()) {
                return new PreparedUpload(existing.getId(), storage.sourceFileKey(existing), null, true);
            }
            existing.renewUploadWindow(now.plus(UPLOAD_WINDOW));
            return new PreparedUpload(existing.getId(), storage.sourceFileKey(existing),
                    storage.prepare(existing), true);
        }
        candidate.identifySource(storage.sourceFileKey(candidate));
        repository.save(candidate);
        return new PreparedUpload(candidate.getId(), storage.sourceFileKey(candidate), storage.prepare(candidate));
    }

    @Transactional
    public PdfExtractionView complete(long ownerId, String id) {
        PdfExtractionJob job = repository.findOwnedForUpdate(id, ownerId, REVIEW).orElseThrow(this::notFound);
        if (job.getUploadedAt() == null) {
            storage.verifySource(job);
            job.confirmUpload(clock.instant());
            events.publishEvent(new PdfExtractionUploadedEvent(job.getId()));
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
                .map(result -> withAiResult(job.getId(), result))
                .map(result -> result.withImageUrls(fileKey -> storage.imageUrl(job, fileKey)))
                .orElse(null);
    }

    private PdfExtractionResult withAiResult(String jobId, PdfExtractionResult result) {
        // 응답 조립만 바꾼다. 추출 payload와 멱등성 해시는 수정하지 않는다.
        PdfApplicantInfo info = aiJobs.findById(jobId)
                .map(this::aiResult)
                .orElse(result.applicantInfo());
        return new PdfExtractionResult(result.status(), result.sourceSha256(), result.errorCode(),
                result.warnings(), result.pages(), info);
    }

    private PdfApplicantInfo aiResult(PdfAiJob job) {
        if (job.getStatus() == PdfAiStatus.COMPLETED) {
            return mapper.readValue(job.getResultJson(), PdfApplicantInfo.class);
        }
        if (job.getStatus() == PdfAiStatus.FAILED) {
            String reason = "INVALID_MODEL_OUTPUT".equals(job.getErrorCode())
                    ? "INVALID_MODEL_OUTPUT" : "PROVIDER_ERROR";
            return new PdfApplicantInfo(PdfApplicantInfo.PROFILE_VERSION, PdfApplicantInfo.FAILED,
                    job.getProvider(), job.getModelId(), null, null, null, null, reason);
        }
        return null;
    }

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

    public record PreparedUpload(String jobId, String fileKey, PdfExtractionStorage.UploadTarget upload,
                                 boolean duplicate) {
        public PreparedUpload(String jobId, String fileKey, PdfExtractionStorage.UploadTarget upload) {
            this(jobId, fileKey, upload, false);
        }
    }
}
