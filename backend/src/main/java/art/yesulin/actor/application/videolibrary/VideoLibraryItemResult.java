package art.yesulin.actor.application.videolibrary;

import art.yesulin.actor.domain.videolibrary.VideoLibraryItem;
import art.yesulin.actor.domain.videolibrary.VideoVisibility;
import java.time.Instant;

public record VideoLibraryItemResult(
        long id,
        String url,
        String youtubeId,
        int displayOrder,
        Instant createdAt,
        VideoVisibility visibility
) {

    public static VideoLibraryItemResult from(VideoLibraryItem item) {
        return new VideoLibraryItemResult(
                item.getId(),
                item.getUrl(),
                item.getYoutubeId(),
                item.getDisplayOrder(),
                item.getCreatedAt(),
                item.getVisibility()
        );
    }
}
