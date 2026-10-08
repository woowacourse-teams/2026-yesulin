package art.yesulin.file.domain;

import static art.yesulin.file.domain.FileErrorCode.METADATA_MISMATCH;
import static art.yesulin.file.domain.FileErrorCode.NOT_READY;
import static art.yesulin.global.validation.DomainValidator.requireNonNull;
import static art.yesulin.global.validation.DomainValidator.requirePositive;
import static art.yesulin.global.validation.DomainValidator.requireText;

import art.yesulin.file.domain.converter.FileStatusConverter;
import art.yesulin.global.exception.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

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

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Embedded
    private FileMetadata metadata;

    @Convert(converter = FileStatusConverter.class)
    @Column(nullable = false, length = 20)
    private FileStatus status;

    @Column(name = "unreferenced_at")
    private Instant unreferencedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    public FileAsset(String objectKey, long ownerId, FileMetadata metadata) {
        this.objectKey = requireText(objectKey, "파일 object key는 필수입니다.");
        this.ownerId = requirePositive(ownerId, "파일 소유자 ID는 1 이상이어야 합니다.");
        this.metadata = requireNonNull(metadata, "파일 메타데이터는 필수입니다.");
        this.status = FileStatus.PENDING;
    }

    public void completeUpload(String actualContentType, long actualSize, Instant completedAt) {
        if (status != FileStatus.PENDING && status != FileStatus.READY) {
            throw new BusinessException(NOT_READY, "삭제 중이거나 삭제된 파일은 업로드를 완료할 수 없습니다.");
        }
        if (!metadata.matches(actualContentType, actualSize)) {
            throw new BusinessException(METADATA_MISMATCH, "업로드 정보가 요청과 일치하지 않습니다.");
        }
        if (status == FileStatus.READY) {
            return;
        }
        status = FileStatus.READY;
        unreferencedAt = requireNonNull(completedAt, "업로드 완료 시각은 필수입니다.");
    }

    public void markUnreferenced(Instant at) {
        if (status != FileStatus.READY) {
            throw new BusinessException(NOT_READY, "완료된 파일만 미사용 시각을 갱신할 수 있습니다.");
        }
        unreferencedAt = requireNonNull(at, "미사용 시작 시각은 필수입니다.");
    }

    public void beginDeletion() {
        if (status == FileStatus.PENDING || status == FileStatus.READY) {
            status = FileStatus.DELETING;
        }
    }

    public void finishDeletion(Instant at) {
        if (status != FileStatus.DELETING) {
            throw new BusinessException(NOT_READY, "삭제 중인 파일만 삭제 완료할 수 있습니다.");
        }
        status = FileStatus.DELETED;
        deletedAt = requireNonNull(at, "삭제 시각은 필수입니다.");
    }

    public void ensureUsable() {
        if (status != FileStatus.READY) {
            throw new BusinessException(NOT_READY, "업로드가 완료된 파일만 사용할 수 있습니다.");
        }
    }
}
