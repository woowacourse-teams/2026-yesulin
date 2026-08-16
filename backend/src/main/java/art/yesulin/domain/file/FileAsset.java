package art.yesulin.domain.file;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;
import static art.yesulin.domain.common.validation.DomainValidator.requireText;
import static art.yesulin.domain.file.FileErrorCode.METADATA_MISMATCH;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.file.converter.FileStatusConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "file_assets", uniqueConstraints = {
        @UniqueConstraint(name = "uk_file_assets_object_key", columnNames = "object_key")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class FileAsset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "object_key", nullable = false, updatable = false, length = 500)
    private String objectKey;

    @Column(name = "owner_id", nullable = false, updatable = false)
    private long ownerId;

    @Embedded
    private FileMetadata metadata;

    @Convert(converter = FileStatusConverter.class)
    @Column(nullable = false, length = 20)
    private FileStatus status;

    public FileAsset(String objectKey, long ownerId, FileMetadata metadata) {
        this.objectKey = requireText(objectKey, "파일 object key는 필수입니다.");
        this.ownerId = requirePositive(ownerId, "파일 소유자 ID는 1 이상이어야 합니다.");
        this.metadata = requireNonNull(metadata, "파일 메타데이터는 필수입니다.");
        this.status = FileStatus.PENDING;
    }

    public void completeUpload(String actualContentType, long actualSize) {
        if (!metadata.matches(actualContentType, actualSize)) {
            throw new BusinessException(METADATA_MISMATCH, "업로드 정보가 요청과 일치하지 않습니다.");
        }
        status = FileStatus.READY;
    }
}
