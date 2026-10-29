package art.yesulin.actor.domain.photolibrary;

import static art.yesulin.global.validation.DomainValidator.requirePositive;

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
import java.util.Set;
import java.util.stream.Collectors;
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

    public void changeVisibility(long itemId, PhotoVisibility visibility) {
        items.changeVisibility(itemId, visibility);
    }

    /** 공개 사본을 만들 수 있는 사진. 보관함에 있고 공개로 설정했어야 한다. */
    public PhotoLibraryItem getPublicPhoto(long photoId) {
        return items.findPublic(photoId);
    }

    /** 공개 사본을 붙이거나 바꾼다. 바뀐 이전 사본은 저장소에서 지워야 한다. */
    public PhotoLibraryItem attachPublicCopy(long photoId, String objectKey) {
        PhotoLibraryItem photo = items.findPublic(photoId);
        photo.attachPublicCopy(objectKey);
        return photo;
    }

    /** 배우 페이지가 공개에서 내려가면 모든 사진의 공개 사본을 뗀다. 저장소에서도 지워야 한다. */
    public void removePublicCopies() {
        items.removePublicCopies();
    }

    public Set<String> publicCopyObjectKeys() {
        return getPhotos().stream()
                .filter(PhotoLibraryItem::hasPublicCopy)
                .map(PhotoLibraryItem::getPublicCopyObjectKey)
                .collect(Collectors.toUnmodifiableSet());
    }

    public List<PhotoLibraryItem> getPhotos() {
        return items.activeValues();
    }

    /** 공개 사본이 준비된 공개 사진 중 보관함 순서가 가장 앞인 것. 사본이 없는 사진은 페이지에 보이지 않는다. */
    public Optional<PhotoLibraryItem> getPageRepresentativePhoto() {
        return getPagePhotos().stream().findFirst();
    }

    /** 배우 페이지에 보이는 사진. 공개로 설정했고 공개 사본이 준비된 사진이다. */
    public List<PhotoLibraryItem> getPagePhotos() {
        return getPhotos().stream()
                .filter(photo -> photo.isPublic() && photo.hasPublicCopy())
                .toList();
    }

    public Optional<PhotoLibraryItem> getRepresentativePhoto() {
        return getPhotos().stream().findFirst();
    }
}
