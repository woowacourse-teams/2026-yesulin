package art.yesulin.pdfextraction.application;

import static art.yesulin.pdfextraction.application.DocumentPreviewTransferStorage.File.INPUT;
import static art.yesulin.pdfextraction.application.DocumentPreviewTransferStorage.File.ORIGINAL;
import static art.yesulin.pdfextraction.application.DocumentPreviewTransferStorage.File.PREVIEW;
import static art.yesulin.pdfextraction.domain.PdfExtractionErrorCode.INVALID_PDF_EXTRACTION_RESULT;
import static art.yesulin.pdfextraction.domain.PdfExtractionErrorCode.PDF_EXTRACTION_NOT_FOUND;
import static art.yesulin.pdfextraction.domain.PdfExtractionErrorCode.PDF_UPLOAD_NOT_READY;

import art.yesulin.global.exception.BusinessException;
import art.yesulin.pdfextraction.application.DocumentPreviewTransferStorage.ObjectInfo;
import art.yesulin.pdfextraction.application.DocumentPreviewTransferStorage.Transfer;
import art.yesulin.pdfextraction.domain.DocumentPreviewStatus;
import art.yesulin.pdfextraction.domain.PdfExtractionJob;
import art.yesulin.pdfextraction.domain.PdfExtractionJobRepository;
import art.yesulin.pdfextraction.domain.PdfExtractionOwnerType;
import art.yesulin.pdfextraction.domain.PdfExtractionPurpose;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "yesulin.pdf-extraction", name = "enabled", havingValue = "true")
public class DocumentPreviewTransfers {

    private final PdfExtractionJobRepository jobs;
    private final DocumentPreviewTransferStorage storage;

    public enum Operation { SOURCE, PREVIEW_READ, PREVIEW_RECOVER, PREVIEW_WRITE, INPUT_WRITE, INPUT_VERIFY }

    public record Request(
            @NotNull UUID jobId, @NotBlank @Size(max = 1024) String originalFileKey,
            @NotBlank @Size(max = 256) @JsonProperty("sourceETag") String sourceEtag, @NotNull Operation operation,
            Long size, @Pattern(regexp = "[0-9a-f]{64}") String sha256
    ) {
    }

    @Transactional
    public Optional<Transfer> prepare(Request request) {
        PdfExtractionJob job = jobs.findForUpdate(request.jobId().toString()).filter(item -> !item.isDeleted())
                .orElseThrow(() -> new BusinessException(PDF_EXTRACTION_NOT_FOUND, "지원서를 찾을 수 없습니다."));
        if (!job.requiresConversion() || job.getPurpose() != PdfExtractionPurpose.PDF_REVIEW
                || job.getOwnerType() != PdfExtractionOwnerType.PRODUCER || job.getReviewId() == null
                || !storage.canonicalOriginalKey(job).equals(request.originalFileKey())
                || !request.originalFileKey().equals(job.getFileKey())) {
            throw mismatch();
        }
        ObjectInfo original = verifiedOriginal(job, request.sourceEtag());
        return switch (request.operation()) {
            case SOURCE -> Optional.of(storage.read(job, ORIGINAL, original));
            case PREVIEW_READ -> job.previewStatus() == DocumentPreviewStatus.READY
                    ? Optional.of(storage.read(job, PREVIEW, preview(job))) : Optional.empty();
            case PREVIEW_RECOVER -> Optional.of(storage.read(job, PREVIEW, preview(job)));
            case PREVIEW_WRITE -> Optional.of(writePreview(job, request));
            case INPUT_WRITE, INPUT_VERIFY -> extractionInput(job, request);
        };
    }

    private ObjectInfo verifiedOriginal(PdfExtractionJob job, String eventTag) {
        ObjectInfo file = storage.inspect(job, ORIGINAL).orElseThrow(this::notReady);
        if (file.size() != job.getSize() || !job.getFileMetadata().getContentType().equals(file.contentType())
                || job.getSourceSha256() == null || !job.getSourceSha256().equals(file.sha256())
                || file.etag() == null || !unquote(file.etag()).equals(unquote(eventTag))) {
            throw mismatch();
        }
        return file;
    }

    private String unquote(String tag) {
        return tag.length() >= 2 && tag.startsWith("\"") && tag.endsWith("\"")
                ? tag.substring(1, tag.length() - 1) : tag;
    }

    private ObjectInfo preview(PdfExtractionJob job) {
        if (job.previewStatus() == DocumentPreviewStatus.FAILED) {
            throw mismatch();
        }
        ObjectInfo file = storage.inspect(job, PREVIEW).orElseThrow(this::notReady);
        if (!isValidPdf(file)
                || (job.getPreviewSha256() != null && !job.getPreviewSha256().equals(file.sha256()))) {
            throw mismatch();
        }
        return file;
    }

    private Transfer writePreview(PdfExtractionJob job, Request request) {
        requireFingerprint(request);
        if (job.previewStatus() == DocumentPreviewStatus.FAILED) {
            throw mismatch();
        }
        if (job.previewStatus() == DocumentPreviewStatus.READY) {
            requireSameFile(preview(job), request);
        }
        return storage.writePdfOnce(job, PREVIEW, request.size(), request.sha256());
    }

    private Optional<Transfer> extractionInput(PdfExtractionJob job, Request request) {
        requireFingerprint(request);
        if (job.previewStatus() != DocumentPreviewStatus.READY || !request.sha256().equals(job.getPreviewSha256())) {
            throw notReady();
        }
        requireSameFile(preview(job), request);
        if (request.operation() == Operation.INPUT_VERIFY) {
            ObjectInfo file = storage.inspect(job, INPUT).orElseThrow(this::notReady);
            if (!isValidPdf(file) || file.size() != request.size() || !request.sha256().equals(file.sha256())) {
                throw notReady();
            }
            return Optional.empty();
        }
        return Optional.of(storage.writePdfOnce(job, INPUT, request.size(), request.sha256()));
    }

    private void requireFingerprint(Request request) {
        if (request.size() == null || request.size() < 1 || request.size() > PdfExtractionJob.MAX_FILE_BYTES
                || request.sha256() == null || !request.sha256().matches("[0-9a-f]{64}")) {
            throw mismatch();
        }
    }

    private void requireSameFile(ObjectInfo file, Request request) {
        if (file.size() != request.size() || !request.sha256().equals(file.sha256())) {
            throw mismatch();
        }
    }

    private boolean isValidPdf(ObjectInfo file) {
        return "application/pdf".equals(file.contentType()) && file.size() > 0
                && file.size() <= PdfExtractionJob.MAX_FILE_BYTES && file.sha256() != null
                && file.sha256().matches("[0-9a-f]{64}") && file.etag() != null;
    }

    private BusinessException mismatch() {
        return new BusinessException(INVALID_PDF_EXTRACTION_RESULT, "지원서 변환 작업 또는 파일 정보가 일치하지 않습니다.");
    }

    private BusinessException notReady() {
        return new BusinessException(PDF_UPLOAD_NOT_READY, "지원서 변환 파일을 아직 확인할 수 없습니다.");
    }
}
