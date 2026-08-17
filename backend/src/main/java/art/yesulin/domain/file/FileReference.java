package art.yesulin.domain.file;

import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;
import static art.yesulin.domain.common.validation.DomainValidator.requireText;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
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
                name = "uk_file_references_target_file",
                columnNames = {"reference_type", "reference_id", "file_id"}
        )
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class FileReference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "file_id", nullable = false, updatable = false)
    private long fileId;

    @Column(name = "reference_type", nullable = false, updatable = false, length = 50)
    private String referenceType;

    @Column(name = "reference_id", nullable = false, updatable = false)
    private long referenceId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public FileReference(String referenceType, long referenceId, long fileId) {
        this.referenceType = requireText(referenceType, "파일 참조 타입은 필수입니다.");
        this.referenceId = requirePositive(referenceId, "참조 대상 ID는 1 이상이어야 합니다.");
        this.fileId = requirePositive(fileId, "참조할 파일 ID는 1 이상이어야 합니다.");
    }
}
