package art.yesulin.actor.application.photolibrary;

import art.yesulin.actor.domain.photolibrary.PhotoLibraryItem;
import art.yesulin.actor.domain.photolibrary.PhotoVisibility;
import java.time.Instant;

/**
 * 사진 보관함 사진 한 장.
 *
 * @param publicCopyUrl 배우 페이지에 보일 공개 사본 주소. 공개 사진이어도 사본을 아직 만들지 않았으면 null이다.
 */
public record PhotoLibraryItemResult(
        long id,
        long fileId,
        String imageUrl,
        int displayOrder,
        boolean representative,
        Instant createdAt,
        PhotoVisibility visibility,
        String publicCopyUrl
) {

    public static PhotoLibraryItemResult from(PhotoLibraryItem item, String imageUrl, String publicCopyUrl) {
        return new PhotoLibraryItemResult(
                item.getId(),
                item.getFileId(),
                imageUrl,
                item.getDisplayOrder(),
                item.isRepresentative(),
                item.getCreatedAt(),
                item.getVisibility(),
                publicCopyUrl
        );
    }
}
