package art.yesulin.legacy.application.photolibrary;

import art.yesulin.legacy.domain.photolibrary.PhotoLibraryItem;
import java.time.Instant;

public record PhotoLibraryItemResult(
        long id,
        long fileId,
        String imageUrl,
        int displayOrder,
        boolean representative,
        Instant createdAt
) {

    public static PhotoLibraryItemResult from(PhotoLibraryItem item, String imageUrl) {
        return new PhotoLibraryItemResult(
                item.getId(),
                item.getFileId(),
                imageUrl,
                item.getDisplayOrder(),
                item.isRepresentative(),
                item.getCreatedAt()
        );
    }
}
