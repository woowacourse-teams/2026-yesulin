package art.yesulin.domain.photolibrary;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;

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
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "photo_library_items", indexes = {
        @Index(
                name = "idx_photo_library_items_active_order",
                columnList = "photo_library_id, deleted_at, display_order"
        ),
        @Index(name = "idx_photo_library_items_file_id", columnList = "file_id")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PhotoLibraryItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Getter(AccessLevel.NONE)
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "photo_library_id", nullable = false, updatable = false)
    private PhotoLibrary library;

    @Column(name = "file_id", nullable = false, updatable = false)
    private long fileId;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    PhotoLibraryItem(PhotoLibrary library, long fileId, int displayOrder) {
        this.library = requireNonNull(library, "사진이 속할 사진보관함은 필수입니다.");
        this.fileId = requirePositive(fileId, "사진 파일 ID는 1 이상이어야 합니다.");
        moveTo(displayOrder);
    }

    void moveTo(int displayOrder) {
        if (displayOrder < 0) {
            throw new IllegalArgumentException("사진 표시 순서는 0 이상이어야 합니다.");
        }
        this.displayOrder = displayOrder;
    }

    void softDelete(Instant deletedAt) {
        this.deletedAt = requireNonNull(deletedAt, "사진 삭제 시각은 필수입니다.");
    }

    boolean hasId(long photoId) {
        return id != null && id == photoId;
    }

    boolean isActive() {
        return deletedAt == null;
    }

    public boolean isRepresentative() {
        return isActive() && displayOrder == 0;
    }
}
