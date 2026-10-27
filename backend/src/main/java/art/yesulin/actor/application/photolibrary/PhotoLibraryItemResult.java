package art.yesulin.actor.application.photolibrary;

import art.yesulin.actor.domain.photolibrary.PhotoLibraryItem;
import art.yesulin.actor.domain.photolibrary.PhotoVisibility;
import java.time.Instant;

public record PhotoLibraryItemResult(
        long id,
        long fileId,
        String imageUrl,
        int displayOrder,
        boolean representative,
        Instant createdAt,
        PhotoVisibility visibility
) {

    public static PhotoLibraryItemResult from(PhotoLibraryItem item, String imageUrl) {
        return new PhotoLibraryItemResult(
                item.getId(),
                item.getFileId(),
                imageUrl,
                item.getDisplayOrder(),
                item.isRepresentative(),
                item.getCreatedAt(),
                item.getVisibility()
        );
    }
}
