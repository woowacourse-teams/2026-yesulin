package art.yesulin.domain.file;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.file.FileErrorCode.REFERENCE_CONFLICT;

import art.yesulin.common.exception.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "file_references", indexes = {
        @Index(name = "idx_file_references_file_id", columnList = "file_id")
}, uniqueConstraints = {
        @UniqueConstraint(
                name = "uk_file_references_target",
                columnNames = {"reference_type", "reference_id", "reference_slot"}
        )
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class FileReference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "file_id", nullable = false)
    private FileAsset fileAsset;

    @Column(name = "reference_type", nullable = false, updatable = false, length = 50)
    private String referenceType;

    @Column(name = "reference_id", nullable = false, updatable = false)
    private long referenceId;

    @Column(name = "reference_slot", nullable = false, updatable = false, length = 50)
    private String referenceSlot;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public FileReference(FileAsset fileAsset, FileReferenceKey key) {
        this.fileAsset = requireNonNull(fileAsset, "참조할 파일은 필수입니다.");
        FileReferenceKey referenceKey = requireNonNull(key, "파일 참조 키는 필수입니다.");
        this.referenceType = referenceKey.referenceType();
        this.referenceId = referenceKey.referenceId();
        this.referenceSlot = referenceKey.referenceSlot();
    }

    public void ensureReferences(long fileId) {
        if (fileAsset.getId() != fileId) {
            throw new BusinessException(REFERENCE_CONFLICT, "이미 다른 파일이 연결된 참조입니다.");
        }
    }

    public void replace(long previousFileId, FileAsset currentFileAsset) {
        ensureReferences(previousFileId);
        this.fileAsset = requireNonNull(currentFileAsset, "교체할 파일은 필수입니다.");
    }
}
