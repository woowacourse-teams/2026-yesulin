package art.yesulin.domain.photolibrary;

import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;

import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "photo_libraries", uniqueConstraints = {
        @UniqueConstraint(name = "uk_photo_libraries_owner_id", columnNames = "owner_id")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PhotoLibrary {

    public static final int MAX_PHOTO_COUNT = 3;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_id", nullable = false, updatable = false)
    private long ownerId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Getter(AccessLevel.NONE)
    @Embedded
    private PhotoLibraryItems items = new PhotoLibraryItems();

    public PhotoLibrary(long ownerId) {
        this.ownerId = requirePositive(ownerId, "사진보관함 소유자 ID는 1 이상이어야 합니다.");
    }

    public PhotoLibraryItem addPhoto(long fileId) {
        return items.add(this, fileId);
    }

    public void movePhotoToFront(long photoId) {
        items.moveToFront(photoId);
    }

    public void movePhoto(long photoId, int displayOrder) {
        items.move(photoId, displayOrder);
    }

    public PhotoLibraryItem deletePhoto(long photoId, Instant deletedAt) {
        return items.delete(photoId, deletedAt);
    }

    public List<PhotoLibraryItem> getPhotos() {
        return items.activeValues();
    }

    public Optional<PhotoLibraryItem> getRepresentativePhoto() {
        return getPhotos().stream().findFirst();
    }
}
