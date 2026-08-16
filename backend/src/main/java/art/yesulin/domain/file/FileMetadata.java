package art.yesulin.domain.file;

import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;
import static art.yesulin.domain.common.validation.DomainValidator.requireText;

import art.yesulin.domain.file.converter.FileTypeConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Embeddable;
import java.util.Locale;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Embeddable
@Getter
@EqualsAndHashCode
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class FileMetadata {

    @Column(name = "original_filename", nullable = false, updatable = false)
    private String originalFilename;

    @Column(name = "content_type", nullable = false, updatable = false, length = 100)
    private String contentType;

    @Convert(converter = FileTypeConverter.class)
    @Column(name = "file_type", nullable = false, updatable = false, length = 20)
    private FileType type;

    @Column(nullable = false, updatable = false)
    private long size;

    public FileMetadata(String originalFilename, String contentType, long size) {
        this.originalFilename = requireText(originalFilename, "원본 파일명은 필수입니다.");
        this.contentType = requireText(contentType, "파일 Content-Type은 필수입니다.").toLowerCase(Locale.ROOT);
        this.type = FileType.from(this.contentType);
        this.size = requirePositive(size, "파일 크기는 0보다 커야 합니다.");
    }

    public boolean matches(String actualContentType, long actualSize) {
        return contentType.equalsIgnoreCase(actualContentType) && size == actualSize;
    }
}
