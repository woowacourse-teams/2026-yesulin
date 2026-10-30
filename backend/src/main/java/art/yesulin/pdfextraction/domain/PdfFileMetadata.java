package art.yesulin.pdfextraction.domain;

import static art.yesulin.pdfextraction.domain.PdfExtractionErrorCode.INVALID_PDF;

import art.yesulin.global.exception.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import java.text.Normalizer;
import java.util.Objects;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Embeddable
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PdfFileMetadata {

    public static final long MAX_BYTES = 25L * 1024 * 1024;

    @Enumerated(EnumType.STRING)
    @Column(name = "file_type", nullable = false, updatable = false, length = 20)
    private PdfSourceFileType type;

    @Column(name = "original_filename", nullable = false, updatable = false, length = 255)
    private String originalFilename;
    @Column(nullable = false, updatable = false)
    private long size;
    @Column(nullable = false, updatable = false, length = 10)
    private String extension;
    @Column(nullable = false, updatable = false, length = 100)
    private String contentType;

    public PdfFileMetadata(String filename, long size) {
        String normalized = Normalizer.normalize(Objects.requireNonNullElse(filename, "").strip(),
                Normalizer.Form.NFC);
        if (normalized.isEmpty() || normalized.length() > 255
                || normalized.chars().anyMatch(Character::isISOControl) || size <= 0 || size > MAX_BYTES) {
            throw new BusinessException(INVALID_PDF, "PDF 파일을 선택해 주세요. 파일당 최대 25MiB까지 올릴 수 있습니다.");
        }
        this.type = PdfSourceFileType.fromFilename(normalized);
        this.originalFilename = normalized;
        this.size = size;
        this.extension = type.getExtension();
        this.contentType = type.getContentType();
    }
}
