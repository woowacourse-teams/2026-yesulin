package art.yesulin.auditionpost.domain;

import static art.yesulin.auditionpost.domain.AuditionPostErrorCode.INVALID_INPUT;

import art.yesulin.global.exception.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 원문에서 내려받아 우리 저장소에 둔 파일. 사진은 본문의 {@code post-file:{순번}} 자리에 들어가고,
 * 첨부파일은 본문 아래 목록으로 보인다. 파일 이름은 원문 그대로 보여 준다.
 */
@Embeddable
@Getter
@EqualsAndHashCode
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AuditionPostFile {

    public static final int MAX_FILENAME_LENGTH = 255;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AuditionPostFileKind kind;

    @Column(name = "object_key", nullable = false, length = 500)
    private String objectKey;

    @Column(name = "original_filename", nullable = false, length = MAX_FILENAME_LENGTH)
    private String originalFilename;

    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    @Column(nullable = false)
    private long size;

    public AuditionPostFile(
            AuditionPostFileKind kind,
            String objectKey,
            String originalFilename,
            String contentType,
            long size
    ) {
        if (kind == null) {
            throw invalid("파일 종류는 필수입니다.");
        }
        if (objectKey == null || objectKey.isBlank()) {
            throw invalid("파일 저장 위치는 필수입니다.");
        }
        if (contentType == null || contentType.isBlank()) {
            throw invalid("파일 형식은 필수입니다.");
        }
        if (size <= 0) {
            throw invalid("빈 파일은 저장할 수 없습니다.");
        }
        this.kind = kind;
        this.objectKey = objectKey;
        this.originalFilename = normalizeFilename(originalFilename);
        this.contentType = contentType;
        this.size = size;
    }

    public boolean isImage() {
        return kind == AuditionPostFileKind.IMAGE;
    }

    private static String normalizeFilename(String filename) {
        String trimmed = filename == null ? "" : filename.trim();
        if (trimmed.isEmpty()) {
            throw invalid("파일 이름은 필수입니다.");
        }
        return trimmed.length() > MAX_FILENAME_LENGTH ? trimmed.substring(0, MAX_FILENAME_LENGTH) : trimmed;
    }

    private static BusinessException invalid(String message) {
        return new BusinessException(INVALID_INPUT, message);
    }
}
