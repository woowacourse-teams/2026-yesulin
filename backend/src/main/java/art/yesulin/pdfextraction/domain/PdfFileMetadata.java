package art.yesulin.pdfextraction.domain;

import static art.yesulin.pdfextraction.domain.PdfExtractionErrorCode.INVALID_PDF;

import art.yesulin.global.exception.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Embeddable
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PdfFileMetadata {

    public static final int MAX_FILENAME_LENGTH = 255;
    public static final long MAX_BYTES = 25L * 1024 * 1024;

    private static final String INVALID_UPLOAD_MESSAGE =
            "PDF 파일을 선택해 주세요. 파일당 최대 25MiB까지 올릴 수 있습니다.";

    @Enumerated(EnumType.STRING)
    @Column(name = "file_type", nullable = false, updatable = false, length = 20)
    private PdfSourceFileType type;

    @Column(name = "original_filename", nullable = false, updatable = false, length = MAX_FILENAME_LENGTH)
    private String originalFilename;
    @Column(nullable = false, updatable = false)
    private long size;
    @Column(nullable = false, updatable = false, length = 10)
    private String extension;
    @Column(nullable = false, updatable = false, length = 100)
    private String contentType;

    public PdfFileMetadata(String filename, long size) {
        if (size <= 0 || size > MAX_BYTES) {
            throw new BusinessException(INVALID_PDF, INVALID_UPLOAD_MESSAGE);
        }
        this.originalFilename = requireOriginalFilename(filename);
        this.type = PdfSourceFileType.fromFilename(originalFilename.stripTrailing());
        this.size = size;
        this.extension = type.getExtension();
        this.contentType = type.getContentType();
    }

    public static String requireOriginalFilename(String filename) {
        if (filename == null || filename.isBlank() || filename.length() > MAX_FILENAME_LENGTH
                || filename.chars().anyMatch(Character::isISOControl)) {
            throw new BusinessException(INVALID_PDF, INVALID_UPLOAD_MESSAGE);
        }
        return filename;
    }
}
