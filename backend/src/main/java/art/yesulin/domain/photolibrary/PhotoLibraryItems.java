package art.yesulin.domain.photolibrary;

import static art.yesulin.domain.photolibrary.PhotoLibraryErrorCode.INVALID_DISPLAY_ORDER;
import static art.yesulin.domain.photolibrary.PhotoLibraryErrorCode.LIMIT_EXCEEDED;
import static art.yesulin.domain.photolibrary.PhotoLibraryErrorCode.PHOTO_NOT_FOUND;

import art.yesulin.common.exception.BusinessException;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Embeddable;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@Embeddable
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PhotoLibraryItems {

    private static final Comparator<PhotoLibraryItem> DISPLAY_ORDER = Comparator.comparingInt(
            PhotoLibraryItem::getDisplayOrder
    );

    @OneToMany(mappedBy = "library", cascade = CascadeType.ALL)
    @OrderBy("displayOrder ASC")
    private List<PhotoLibraryItem> values = new ArrayList<>();

    PhotoLibraryItem add(PhotoLibrary library, long fileId) {
        List<PhotoLibraryItem> activeItems = activeValues();
        if (activeItems.size() >= PhotoLibrary.MAX_PHOTO_COUNT) {
            throw new BusinessException(LIMIT_EXCEEDED, "사진보관함에는 사진을 최대 20장까지 저장할 수 있습니다.");
        }
        PhotoLibraryItem item = new PhotoLibraryItem(library, fileId, activeItems.size());
        values.add(item);
        return item;
    }

    void moveToFront(long photoId) {
        move(photoId, 0);
    }

    void move(long photoId, int displayOrder) {
        PhotoLibraryItem target = findActive(photoId);
        List<PhotoLibraryItem> reordered = new ArrayList<>(activeValues());
        reordered.remove(target);
        if (displayOrder < 0 || displayOrder >= reordered.size() + 1) {
            throw new BusinessException(INVALID_DISPLAY_ORDER, "사진 표시 순서가 보관함 범위를 벗어났습니다.");
        }
        reordered.add(displayOrder, target);
        reorder(reordered);
    }

    PhotoLibraryItem delete(long photoId, Instant deletedAt) {
        PhotoLibraryItem target = findActive(photoId);
        target.softDelete(deletedAt);
        reorder(activeValues());
        return target;
    }

    private PhotoLibraryItem findActive(long photoId) {
        return values.stream()
                .filter(PhotoLibraryItem::isActive)
                .filter(item -> item.hasId(photoId))
                .findFirst()
                .orElseThrow(() -> new BusinessException(PHOTO_NOT_FOUND, "사진보관함에서 사진을 찾을 수 없습니다."));
    }

    private void reorder(List<PhotoLibraryItem> items) {
        for (int index = 0; index < items.size(); index++) {
            items.get(index).moveTo(index);
        }
    }

    List<PhotoLibraryItem> activeValues() {
        return values.stream()
                .filter(PhotoLibraryItem::isActive)
                .sorted(DISPLAY_ORDER)
                .toList();
    }
}
