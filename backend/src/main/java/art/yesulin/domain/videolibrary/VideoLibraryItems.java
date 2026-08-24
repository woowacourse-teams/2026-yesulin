package art.yesulin.domain.videolibrary;

import static art.yesulin.domain.videolibrary.VideoLibraryErrorCode.DUPLICATE_VIDEO;
import static art.yesulin.domain.videolibrary.VideoLibraryErrorCode.INVALID_DISPLAY_ORDER;
import static art.yesulin.domain.videolibrary.VideoLibraryErrorCode.LIMIT_EXCEEDED;
import static art.yesulin.domain.videolibrary.VideoLibraryErrorCode.VIDEO_NOT_FOUND;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.video.YouTubeVideoUrl;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Embeddable;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@Embeddable
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class VideoLibraryItems {

    private static final Comparator<VideoLibraryItem> DISPLAY_ORDER = Comparator.comparingInt(
            VideoLibraryItem::getDisplayOrder
    );

    @OneToMany(mappedBy = "library", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("displayOrder ASC")
    private List<VideoLibraryItem> values = new ArrayList<>();

    VideoLibraryItem add(VideoLibrary library, YouTubeVideoUrl video) {
        if (values.size() >= VideoLibrary.MAX_VIDEO_COUNT) {
            throw new BusinessException(LIMIT_EXCEEDED, "영상보관함에는 영상을 최대 10개까지 저장할 수 있습니다.");
        }
        if (values.stream().anyMatch(item -> item.getYoutubeId().equals(video.videoId()))) {
            throw new BusinessException(DUPLICATE_VIDEO, "이미 영상보관함에 저장된 YouTube 영상입니다.");
        }
        VideoLibraryItem item = new VideoLibraryItem(library, video, values.size());
        values.add(item);
        return item;
    }

    void move(long videoId, int displayOrder) {
        VideoLibraryItem target = find(videoId);
        List<VideoLibraryItem> reordered = new ArrayList<>(orderedValues());
        reordered.remove(target);
        if (displayOrder < 0 || displayOrder >= reordered.size() + 1) {
            throw new BusinessException(INVALID_DISPLAY_ORDER, "영상 표시 순서가 보관함 범위를 벗어났습니다.");
        }
        reordered.add(displayOrder, target);
        reorder(reordered);
    }

    void delete(long videoId) {
        VideoLibraryItem target = find(videoId);
        values.remove(target);
        reorder(orderedValues());
    }

    private VideoLibraryItem find(long videoId) {
        return values.stream()
                .filter(item -> item.hasId(videoId))
                .findFirst()
                .orElseThrow(() -> new BusinessException(VIDEO_NOT_FOUND, "영상보관함에서 영상을 찾을 수 없습니다."));
    }

    private void reorder(List<VideoLibraryItem> items) {
        for (int index = 0; index < items.size(); index++) {
            items.get(index).moveTo(index);
        }
    }

    List<VideoLibraryItem> orderedValues() {
        return values.stream().sorted(DISPLAY_ORDER).toList();
    }
}
