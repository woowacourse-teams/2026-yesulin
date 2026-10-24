package art.yesulin.pdfextraction.domain;

import static art.yesulin.pdfextraction.domain.PdfExtractionErrorCode.INVALID_PDF;

import art.yesulin.global.exception.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.text.Normalizer;
import java.time.Instant;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "pdf_extraction_jobs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PdfExtractionJob {

    public static final long MAX_FILE_BYTES = 25L * 1024 * 1024;

    @Id
    @Column(length = 36)
    private String id;

    @Column(nullable = false, updatable = false)
    private long ownerId;

    @Column(nullable = false, updatable = false, length = 255)
    private String originalFilename;

    @Column(nullable = false, updatable = false)
    private long size;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false, updatable = false)
    private Instant uploadExpiresAt;

    private Instant uploadedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PdfExtractionStatus status;

    public PdfExtractionJob(long ownerId, String filename, long size, Instant now, Instant expiresAt) {
        String normalized = Normalizer.normalize(Objects.requireNonNullElse(filename, "").strip(),
                Normalizer.Form.NFC);
        if (ownerId < 1 || normalized.isEmpty() || normalized.length() > 255
                || !normalized.toLowerCase(Locale.ROOT).endsWith(".pdf")
                || normalized.chars().anyMatch(Character::isISOControl)
                || size <= 0 || size > MAX_FILE_BYTES) {
            throw new BusinessException(INVALID_PDF, "PDF 파일을 선택해 주세요. 파일당 최대 25MiB까지 올릴 수 있습니다.");
        }
        this.id = UUID.randomUUID().toString();
        this.ownerId = ownerId;
        this.originalFilename = normalized;
        this.size = size;
        this.createdAt = Objects.requireNonNull(now);
        this.uploadExpiresAt = Objects.requireNonNull(expiresAt);
        this.status = PdfExtractionStatus.UPLOADING;
    }

    public void confirmUpload(Instant now) {
        if (uploadedAt != null) {
            return;
        }
        uploadedAt = now;
        status = PdfExtractionStatus.QUEUED;
    }

    public void finish(String resultStatus) {
        PdfExtractionStatus next = PdfExtractionStatus.valueOf(resultStatus);
        if (uploadedAt == null || !next.isFinal()) {
            throw new IllegalArgumentException("완료된 추출 결과만 반영할 수 있습니다.");
        }
        status = next;
    }
}
