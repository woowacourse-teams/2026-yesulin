package art.yesulin.application.videolibrary;

import art.yesulin.domain.videolibrary.VideoLibraryItem;
import java.time.Instant;

public record VideoLibraryItemResult(
        long id,
        String url,
        String youtubeId,
        int displayOrder,
        Instant createdAt
) {

    public static VideoLibraryItemResult from(VideoLibraryItem item) {
        return new VideoLibraryItemResult(
                item.getId(),
                item.getUrl(),
                item.getYoutubeId(),
                item.getDisplayOrder(),
                item.getCreatedAt()
        );
    }
}
